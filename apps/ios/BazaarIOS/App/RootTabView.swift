import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            WantsHomeView()
                .tabItem {
                    Label("Wants", systemImage: "list.bullet.rectangle")
                }

            ProfileHomeView()
                .tabItem {
                    Label("Profile", systemImage: "person.text.rectangle")
                }

            AccountHomeView()
                .tabItem {
                    Label("Account", systemImage: "person.crop.circle")
                }
        }
    }
}
