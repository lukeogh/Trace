// Prevents the extra console window on Windows in release builds.
// In debug mode we keep the console so we can see port selection + health
// check logs while iterating with `cargo tauri dev`.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpListener;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

/// Find a free TCP port by binding to port 0 and reading what the OS hands
/// back. The listener is dropped immediately, freeing the port for the
/// sidecar. There is a tiny TOCTOU race here — acceptable for a single-user
/// desktop app on the loopback interface.
fn find_free_port() -> u16 {
    let listener = TcpListener::bind("127.0.0.1:0").expect("failed to bind to a free port");
    listener
        .local_addr()
        .expect("failed to read assigned port")
        .port()
}

/// Block (with sleeps) until the backend responds to the health endpoint, or
/// until we give up. This runs inside `setup()`, which is synchronous; using
/// reqwest::blocking here avoids deadlocking the Tauri runtime.
fn wait_for_backend(port: u16) -> Result<(), String> {
    let url = format!("http://127.0.0.1:{}/api/health", port);
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(|e| e.to_string())?;

    let max_attempts = 60;          // 60 × 500 ms = 30 s ceiling
    let delay = Duration::from_millis(500);
    for attempt in 0..max_attempts {
        if let Ok(resp) = client.get(&url).send() {
            if resp.status().is_success() {
                return Ok(());
            }
        }
        if attempt == 0 {
            println!("Waiting for Trace. backend on port {}...", port);
        }
        std::thread::sleep(delay);
    }
    Err(format!(
        "Trace. backend did not respond on port {} within 30 seconds",
        port
    ))
}

/// Resolve the per-user data directory. On Windows this is
/// `%APPDATA%\com.trace.app\` (driven by the identifier in tauri.conf.json).
/// Falls back to a `Trace` folder in the platform's local-data dir if Tauri's
/// path resolver fails — which it shouldn't, but defensive code is cheap.
fn resolve_data_dir(app: &AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| {
            dirs::data_local_dir()
                .unwrap_or_else(|| std::path::PathBuf::from("."))
                .join("Trace")
        })
}

fn main() {
    // Shared handle to the spawned sidecar — used so the RunEvent::Exit
    // hook can kill the child cleanly on app quit.
    let sidecar_child: Arc<Mutex<Option<CommandChild>>> = Arc::new(Mutex::new(None));
    let sidecar_child_for_exit = sidecar_child.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // A second launch happened — focus the existing window instead of
            // starting another backend.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .setup(move |app| {
            let port = find_free_port();
            let data_dir = resolve_data_dir(&app.handle());

            println!("Trace. starting on port {}", port);
            println!("Data directory: {}", data_dir.display());

            std::fs::create_dir_all(&data_dir)?;

            let data_dir_arg = data_dir
                .to_str()
                .ok_or_else(|| "data dir path is not valid UTF-8".to_string())?;

            // Spawn the PyInstaller-built backend as a sidecar.
            let child = app
                .shell()
                .sidecar("trace-backend")?
                .args([
                    "--port",
                    &port.to_string(),
                    "--data-dir",
                    data_dir_arg,
                ])
                .spawn()
                .map_err(|e| {
                    eprintln!("Failed to spawn trace-backend sidecar: {}", e);
                    e
                })?;

            *sidecar_child.lock().unwrap() = Some(child.1);
            // Note: app.shell().sidecar(...).spawn() returns a (rx, child)
            // tuple. The rx half (stdout/stderr) is dropped silently here
            // because the sidecar console is suppressed in release builds.

            // Block this thread until the backend responds. The Tauri runtime
            // hasn't started the event loop yet — this is fine.
            wait_for_backend(port).map_err(|e| {
                eprintln!("{}", e);
                std::io::Error::new(std::io::ErrorKind::TimedOut, e)
            })?;

            // Navigate the (hidden, blank) main window to the live backend,
            // then show it. Doing this after the health check is the reason
            // users never see a blank "connection refused" page.
            let window = app
                .get_webview_window("main")
                .expect("main window not found");
            let backend_url = format!("http://127.0.0.1:{}", port);
            window.navigate(backend_url.parse().expect("bad backend URL"))?;
            window.show()?;

            setup_tray(app.handle().clone())?;

            Ok(())
        })
        .on_window_event(move |window, event| {
            // Intercept close — hide to the tray instead of quitting, so the
            // backend keeps running in the background until the user really
            // chooses Quit from the tray menu.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building the Trace. desktop shell")
        .run(move |_app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(child) = sidecar_child_for_exit.lock().unwrap().take() {
                    // Ignore errors — process may already be gone.
                    let _ = child.kill();
                }
            }
        });
}

fn setup_tray(app: AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(&app, "show", "Show Trace.", true, None::<&str>)?;
    let quit = MenuItem::with_id(&app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(&app, &[&show, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(&app)?;

    Ok(())
}
