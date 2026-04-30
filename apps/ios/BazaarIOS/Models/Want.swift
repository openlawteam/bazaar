import Foundation

enum WantStatus: String, CaseIterable, Codable {
    case intake
    case searching
    case awaitingApproval = "awaiting_approval"
    case contactingSeller = "contacting_seller"
    case completed
    case cancelled

    var label: String {
        switch self {
        case .intake:
            return "Intake"
        case .searching:
            return "Searching"
        case .awaitingApproval:
            return "Awaiting Approval"
        case .contactingSeller:
            return "Contacting Seller"
        case .completed:
            return "Completed"
        case .cancelled:
            return "Cancelled"
        }
    }
}

struct WantApprovalState: Codable {
    var contactSeller: Bool
    var placeOffer: Bool
    var finalizePurchase: Bool
}

struct Want: Identifiable, Codable {
    let id: String
    var title: String
    var rawText: String
    var status: WantStatus
    var maxBudgetCents: Int?
    var locationLabel: String
    var createdAt: Date
    var approvals: WantApprovalState
}

extension Want {
    static let mock: [Want] = [
        Want(
            id: "want_1",
            title: "Used road bike under $500",
            rawText: "Find me a used road bike under $500 near Brooklyn",
            status: .searching,
            maxBudgetCents: 50_000,
            locationLabel: "Brooklyn, NY",
            createdAt: Date.now.addingTimeInterval(-86_400),
            approvals: WantApprovalState(contactSeller: false, placeOffer: false, finalizePurchase: false)
        ),
        Want(
            id: "want_2",
            title: "Standing desk 55 inch",
            rawText: "Need a 55 inch standing desk, ship if local unavailable",
            status: .awaitingApproval,
            maxBudgetCents: 35_000,
            locationLabel: "NYC Metro",
            createdAt: Date.now.addingTimeInterval(-172_800),
            approvals: WantApprovalState(contactSeller: true, placeOffer: false, finalizePurchase: false)
        ),
        Want(
            id: "want_3",
            title: "Refurb iPad mini",
            rawText: "Find a refurb iPad mini latest generation under 450",
            status: .intake,
            maxBudgetCents: 45_000,
            locationLabel: "Shipping OK",
            createdAt: Date.now.addingTimeInterval(-3_600),
            approvals: WantApprovalState(contactSeller: false, placeOffer: false, finalizePurchase: false)
        )
    ]
}
