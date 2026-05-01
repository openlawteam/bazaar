import SwiftUI

struct AccountHomeView: View {
    @State private var phoneNumber = ""
    @State private var verificationCode = ""
    @State private var isLoading = false
    @State private var state: AccountAuthState = .enterPhone

    var body: some View {
        NavigationStack {
            Form {
                Section("Phone Number") {
                    TextField("+1 555 555 5555", text: $phoneNumber)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                }

                if case .codeSent = state {
                    Section("Verification Code") {
                        TextField("6-digit code", text: $verificationCode)
                            .keyboardType(.numberPad)
                    }
                }

                Section {
                    switch state {
                    case .enterPhone, .error:
                        Button(isLoading ? "Sending..." : "Send Code") {
                            Task { await sendOTP() }
                        }
                        .disabled(isLoading)
                    case .codeSent:
                        Button(isLoading ? "Verifying..." : "Verify") {
                            Task { await verifyOTP() }
                        }
                        .disabled(isLoading)
                    case .verified:
                        Label("Signed in", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    }
                }

                if case let .error(message) = state {
                    Section {
                        Text(message)
                            .foregroundStyle(.red)
                    }
                }

                if case .codeSent = state {
                    Section {
                        Button("Start Over", role: .destructive) {
                            reset()
                        }
                    }
                }

                Section("Stretch Goals") {
                    NavigationLink("Notifications and Widgets") {
                        NotificationsWidgetsView()
                    }
                }
            }
            .navigationTitle("Account")
        }
    }

    private func sendOTP() async {
        let digits = phoneNumber.filter(\.isNumber)
        guard digits.count >= 10 else {
            state = .error("Please enter a valid phone number.")
            return
        }

        isLoading = true
        defer { isLoading = false }
        try? await Task.sleep(nanoseconds: 700_000_000)
        state = .codeSent
    }

    private func verifyOTP() async {
        guard verificationCode.count == 6 else {
            state = .error("Code must be 6 digits.")
            return
        }

        isLoading = true
        defer { isLoading = false }
        try? await Task.sleep(nanoseconds: 700_000_000)
        state = verificationCode == "123456" ? .verified : .error("Invalid code. Use 123456 for this demo.")
    }

    private func reset() {
        verificationCode = ""
        state = .enterPhone
    }
}
