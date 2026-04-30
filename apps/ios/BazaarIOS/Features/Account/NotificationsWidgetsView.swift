import SwiftUI

struct NotificationsWidgetsView: View {
    @State private var pushEnabled = true
    @State private var statusAlertsEnabled = true
    @State private var approvalAlertsEnabled = true
    @State private var widgetEnabled = false

    var body: some View {
        Form {
            Section("Push Notifications") {
                Toggle("Enable notifications", isOn: $pushEnabled)
                Toggle("Want status updates", isOn: $statusAlertsEnabled)
                    .disabled(!pushEnabled)
                Toggle("Approval required alerts", isOn: $approvalAlertsEnabled)
                    .disabled(!pushEnabled)
            } footer: {
                Text("These are UI placeholders until notification permissions and backend events are wired.")
            }

            Section("Widgets") {
                Toggle("Enable Home Screen widget", isOn: $widgetEnabled)
                if widgetEnabled {
                    Text("Widget preview: shows current active wants and approvals.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Notifications")
    }
}
