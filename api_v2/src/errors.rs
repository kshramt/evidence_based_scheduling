use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use tracing::error;

#[derive(Debug)]
pub enum ErrorStatus {
    Status400,
    Status500,
}

impl std::error::Error for ErrorStatus {}

impl std::fmt::Display for ErrorStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ErrorStatus::Status400 => write!(f, "Status400"),
            ErrorStatus::Status500 => write!(f, "Status500"),
        }
    }
}

impl<T> From<std::sync::PoisonError<std::sync::MutexGuard<'_, T>>> for ErrorStatus {
    fn from(err: std::sync::PoisonError<std::sync::MutexGuard<'_, T>>) -> Self {
        error!(err = err.to_string());
        Self::Status500
    }
}

impl From<sqlx::error::Error> for ErrorStatus {
    fn from(err: sqlx::error::Error) -> Self {
        error!(err = err.to_string());
        Self::Status500
    }
}

impl IntoResponse for ErrorStatus {
    fn into_response(self) -> Response {
        match self {
            ErrorStatus::Status400 => (
                StatusCode::BAD_REQUEST,
                Json(json!({"error": "Bad request."})),
            )
                .into_response(),
            ErrorStatus::Status500 => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Something went wrong."})),
            )
                .into_response(),
        }
    }
}
