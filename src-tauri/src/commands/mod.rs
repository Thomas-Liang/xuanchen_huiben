pub mod character_binding;
pub mod prompt_parser;
pub mod image_generator;
pub mod image_organization;
pub mod export_package;
pub mod share;
pub mod webhook;

use std::net::UdpSocket;

pub fn get_local_ip_address() -> String {
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}
