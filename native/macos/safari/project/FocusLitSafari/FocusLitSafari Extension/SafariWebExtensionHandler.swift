//
//  SafariWebExtensionHandler.swift
//  FocusLitSafari Extension
//
//  Created by Andrew Chen on 9/28/26.
//

import SafariServices
import os

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private static let protocolVersion = 1
    private static let testPagePathMarker = "/focuslit-safari-test-page/index.html"

    // Static reason codes are safe to keep in the local system log. Never log
    // the rejected message itself: it may contain a page URL or title.
    private enum ValidationFailure: String, Error {
        case missingMessage
        case notJSONObject
        case serializationFailed
        case decodingFailed
        case unexpectedType
        case unsupportedProtocol
        case invalidMessageID
        case invalidPageIdentity
        case invalidTimestamp
        case oversizedURL
        case oversizedTitle
        case invalidFixtureURL
    }

    private struct SafariTabObserved: Decodable {
        struct Page: Decodable {
            let windowId: Int
            let tabId: Int
        }

        let type: String
        let protocolVersion: Int
        let messageId: String
        let page: Page
        let url: String
        let title: String
        let observedAtMs: Int64
    }

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let rawMessage = nativeMessage(from: request)

        switch decodeAndValidate(rawMessage) {
        case .failure(let reason):
            os_log(
                "Rejected Safari fixture observation: %{public}@",
                log: .default,
                type: .error,
                reason.rawValue
            )
            complete(context, message: ["type": "safariRejected", "reason": "invalidMessage"])
            return
        case .success(let observed):
            // This first Safari slice deliberately proves only JS -> native
            // delivery. It does not retain page data or grant close authority;
            // the later Electron bridge must be separately authenticated.
            os_log(
                "Accepted Safari fixture observation %{public}@",
                log: .default,
                type: .info,
                observed.messageId
            )
            complete(context, message: [
                "type": "safariWelcome",
                "protocolVersion": Self.protocolVersion,
            ])
        }

    }

    private func nativeMessage(from request: NSExtensionItem?) -> Any? {
        if #available(iOS 15.0, macOS 11.0, *) {
            return request?.userInfo?[SFExtensionMessageKey]
        }
        return request?.userInfo?["message"]
    }

    private func decodeAndValidate(_ rawMessage: Any?) -> Result<SafariTabObserved, ValidationFailure> {
        guard let rawMessage else { return .failure(.missingMessage) }
        guard JSONSerialization.isValidJSONObject(rawMessage) else { return .failure(.notJSONObject) }
        guard let data = try? JSONSerialization.data(withJSONObject: rawMessage) else {
            return .failure(.serializationFailed)
        }
        guard let message = try? JSONDecoder().decode(SafariTabObserved.self, from: data) else {
            return .failure(.decodingFailed)
        }
        guard message.type == "safariTabObserved" else { return .failure(.unexpectedType) }
        guard message.protocolVersion == Self.protocolVersion else {
            return .failure(.unsupportedProtocol)
        }
        guard UUID(uuidString: message.messageId) != nil else { return .failure(.invalidMessageID) }
        guard message.page.windowId >= 0, message.page.tabId >= 0 else {
            return .failure(.invalidPageIdentity)
        }
        guard message.observedAtMs >= 0 else { return .failure(.invalidTimestamp) }
        guard message.url.utf8.count <= 4096 else { return .failure(.oversizedURL) }
        guard message.title.utf8.count <= 1024 else { return .failure(.oversizedTitle) }
        guard
            let url = URL(string: message.url),
            url.isFileURL,
            url.path.hasSuffix(Self.testPagePathMarker)
        else {
            return .failure(.invalidFixtureURL)
        }
        return .success(message)
    }

    private func complete(_ context: NSExtensionContext, message: [String: Any]) {
        let response = NSExtensionItem()
        if #available(iOS 15.0, macOS 11.0, *) {
            response.userInfo = [SFExtensionMessageKey: message]
        } else {
            response.userInfo = ["message": message]
        }
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }

}
