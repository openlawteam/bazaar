import SwiftUI

struct AccountHomeView: View {
    @StateObject private var viewModel = AccountViewModel()

    var body: some View {
        NavigationStack {
            Form {
                Section("Phone Number") {
                    TextField("+1 555 555 5555", text: $viewModel.phoneNumber)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                }

                if case .codeSent = viewModel.state {
                    Section("Verification Code") {
                        TextField("6-digit code", text: $viewModel.verificationCode)
                            .keyboardType(.numberPad)
                    }
                }

                Section {
                    switch viewModel.state {
                    case .enterPhone, .error:
                        Button(viewModel.isLoading ? "Sending..." : "Send Code") {
                            Task { await viewModel.sendOTP() }
                        }
                        .disabled(viewModel.isLoading)
                    case .codeSent:
                        Button(viewModel.isLoading ? "Verifying..." : "Verify") {
                            Task { await viewModel.verifyOTP() }
                        }
                        .disabled(viewModel.isLoading)
                    case .verified:
                        Label("Signed in", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    }
                }

                if case let .error(message) = viewModel.state {
                    Section {
                        Text(message)
                            .foregroundStyle(.red)
                    }
                }

                if case .codeSent = viewModel.state {
                    Section {
                        Button("Start Over", role: .destructive) {
                            viewModel.reset()
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
}
