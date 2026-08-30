# The OfPay Symbol

The OfPay symbol is a lowercase **f** nested inside a circular **O**. It is intended to function as a compact communication glyph for an “of value” payment: an AUD-denominated price paid using the buyer’s chosen digital currency.

## Primary construction

- The outer **O** represents an exchange of value in motion. It begins where the **f** joins the ring at six o'clock, flows anti-clockwise and stops 2.5 line widths before closing.
- The inner lowercase **f** supplies the spoken “of” sound and distinguishes the mark from `@`.
- The crossbar is deliberately wide so the **f** remains readable at small interface sizes.
- The measured 2.5-line-width opening prevents the mark from reading as a generic enclosed monogram and gives it a repeatable typographic construction.
- The monoline construction keeps the symbol compatible with type, signage, QR interfaces and payment buttons.

## Recommended written usage

Use the symbol between a fiat price and an accepted digital asset:

- `A$160 [OfPay symbol] BTC`
- `A$289 [OfPay symbol] ETH / SOL / STAT`
- `A$11,999 [OfPay symbol] buyer's choice`

Until the symbol receives a Unicode code point or is shipped in a custom font, use the SVG as an inline icon and use **of** as the accessible-text fallback.

## Asset variants

- `public/ofpay-symbol.svg` - single-colour master using `currentColor`.
- `public/ofpay-symbol-solid.svg` - filled master for tiny sizes, stamps and favicons.
- `public/ofpay-symbol-gold.svg` - W8R presentation version in the house gold gradient.

## Minimum-use guidance

- Use the monoline master at 24 px and above.
- Use the solid master below 24 px.
- Preserve clear space equal to one quarter of the symbol’s diameter.
- Do not rotate, add an @ tail, compress the circle, or place other letters inside it.
