//
//  ViewController.swift
//  FocusLitSafari
//
//  Created by Andrew Chen on 9/28/26.
//

import Cocoa
import SafariServices

private let extensionBundleIdentifier = "com.andreweats.focuslit.safari.Extension"

@MainActor
final class ViewController: NSViewController {
    private let statusLabel = NSTextField(
        wrappingLabelWithString: "FocusLit Safari Bridge is ready. Open Safari Extensions Settings to enable it."
    )
    private let openSettingsButton = NSButton(
        title: "Open Safari Extensions Settings…",
        target: nil,
        action: nil
    )

    override func viewDidLoad() {
        super.viewDidLoad()
        configureInterface()
    }

    private func configureInterface() {
        view.subviews.forEach { $0.removeFromSuperview() }

        statusLabel.alignment = .center
        statusLabel.lineBreakMode = .byWordWrapping
        statusLabel.maximumNumberOfLines = 0
        statusLabel.setContentCompressionResistancePriority(.required, for: .vertical)

        openSettingsButton.target = self
        openSettingsButton.action = #selector(openSafariExtensionSettings)

        let stack = NSStackView(views: [statusLabel, openSettingsButton])
        stack.orientation = .vertical
        stack.alignment = .centerX
        stack.spacing = 18
        stack.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -28),
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            statusLabel.widthAnchor.constraint(lessThanOrEqualToConstant: 340),
        ])
    }

    @objc private func openSafariExtensionSettings() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { [weak self] error in
            guard let error else { return }
            DispatchQueue.main.async {
                self?.statusLabel.stringValue = "Safari could not open extension settings: \(error.localizedDescription)"
            }
        }
    }
}
