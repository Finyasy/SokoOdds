use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use std::{env, net::SocketAddr, sync::Arc, time::Duration};
use tokio::{sync::RwLock, time::sleep};
use tracing_subscriber::EnvFilter;

#[derive(Clone, Serialize)]
struct HealthResponse {
    status: String,
    service: String,
    books_loaded: usize,
    order_intake_enabled: bool,
    last_stream_offset: Option<String>,
}

#[derive(Clone)]
struct AppState {
    health: Arc<RwLock<HealthResponse>>,
}

async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(state.health.read().await.clone())
}

fn env_usize(name: &str, default: usize) -> usize {
    env::var(name)
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(default)
}

fn env_u16(name: &str, default: u16) -> u16 {
    env::var(name)
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(default)
}

async fn hydrate_books(state: AppState) {
    let delay_ms = env_usize("ENGINE_HYDRATION_DELAY_MS", 250) as u64;
    let books_loaded = env_usize("ENGINE_BOOKS_LOADED", 3);
    let last_stream_offset = env::var("ENGINE_LAST_STREAM_OFFSET").ok();

    sleep(Duration::from_millis(delay_ms)).await;

    let mut health = state.health.write().await;
    health.status = "ready".to_string();
    health.books_loaded = books_loaded;
    health.order_intake_enabled = true;
    health.last_stream_offset = last_stream_offset;
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let state = AppState {
        health: Arc::new(RwLock::new(HealthResponse {
            status: "hydrating".to_string(),
            service: "market-engine".to_string(),
            books_loaded: 0,
            order_intake_enabled: false,
            last_stream_offset: None,
        })),
    };

    tokio::spawn(hydrate_books(state.clone()));

    let app = Router::new()
        .route("/internal/health", get(health))
        .with_state(state);
    let addr = SocketAddr::from(([0, 0, 0, 0], env_u16("ENGINE_PORT", 9000)));
    let listener = tokio::net::TcpListener::bind(addr).await?;

    axum::serve(listener, app).await?;

    Ok(())
}
