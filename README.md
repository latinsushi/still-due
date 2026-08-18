# Still Due

A polite overdue invoice follow-up in 60 seconds.

A static web tool for independent designers, developers, and consultants after delivery. Paste the job, days late, and amount. Get a sendable email and a one-page PDF reminder.

Price: $19 once. The generator is free to try. Licensed PDFs drop the free-version footer line.

This is not a collections agency. Not legal advice. Not a threat.

## How to open locally

No build step. No backend.

```bash
cd projects/003-still-due
python3 -m http.server 8080
```

Then open http://localhost:8080/

Unlock a watermark-free PDF for testing:

http://localhost:8080/?license=demo

That sets `localStorage.stillDueLicense`.

## Where this gets found

SEO pages first. People search "overdue invoice email template" and "invoice follow up freelance" after an unpaid invoice.

Communities later. Reddit unpaid-invoice threads. Do not post until 001/002 leftover comments are done.

## Privacy

Nothing typed in the form is uploaded. It stays in the browser.
