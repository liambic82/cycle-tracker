require 'json'
package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))
Pod::Spec.new do |s|
  s.name = 'CyclePassphraseCrypto'
  s.version = package['version']
  s.summary = 'Native passphrase derivation for the Trifelle local journal'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'Trifelle contributors'
  s.homepage = 'https://github.com/liambic82/cycle-tracker'
  s.source = { :git => 'https://github.com/liambic82/cycle-tracker.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
