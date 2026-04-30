import Foundation

enum AppConfig {
    // For simulator. Use your Mac LAN IP when testing on a physical device.
    static let baseURL = URL(string: "http://127.0.0.1:8787")!
}
