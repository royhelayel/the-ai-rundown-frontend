# RadioNews email OTP templates

Apply these in Supabase Authentication → Email templates. These files are source-controlled
copies; deploying the frontend does **not** update Supabase's hosted templates.

| Template | Subject | HTML |
| --- | --- | --- |
| Confirm signup | Your RadioNews signup code | `confirm-signup.html` |
| Magic link / OTP | Your RadioNews sign-in code | `magic-link.html` |

Both templates intentionally display `{{ .Token }}` and contain no confirmation link.
The app uses `signInWithOtp({ options: { shouldCreateUser: true } })` followed by
`verifyOtp({ email, token, type: 'email' })` for both signup and returning-user sign-in.
Keep email confirmation enabled; do not disable verification to work around a template issue.

Verify with a new address and a returning account: request the email, enter its code in the
same app session, and confirm the profile and preferences load. Do not record real OTPs in
screenshots or logs. Changing templates does not change emails already delivered; request a
fresh code after saving the templates.
