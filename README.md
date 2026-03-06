# Expo OTA Code Signing

Place your Expo Updates code signing files in this folder.

- Public certificate (safe to commit): `certs/updates-code-signing-cert.pem`
- Private key (never commit): `certs/updates-code-signing-private-key.pem`

Generate both with:

```bash
npx expo-updates codesigning:generate
```

Then copy/rename the generated files to the names above.

After files are in place, build a new binary so the certificate is embedded.
