# Profile design

The public profile is rendered from the root README.md. All displayed graphics are stored in assets/. The profile is entirely in English and features World Builder and the multimodal browser-interface project.

## Dynamic widgets

The `Update profile widgets` GitHub Actions workflow generates GitHub statistics, language distribution, and a contribution-grid snake animation. It refreshes daily and can also be run manually. The generated cards are stored in `assets/generated/` and served directly from this repository.

Statistics are generated with https://github.com/stats-organization/github-readme-stats-action. The snake animation uses https://github.com/Platane/snk. The statistics layout was inspired by https://github.com/MinmusLin; the profile biography and visual design remain specific to this account.

WakaTime is not connected yet. See [WakaTime setup](WAKATIME_SETUP.md) for the remaining account and editor configuration.

## Manual refresh

Hosted automation is currently unavailable for this account. The initial statistics and contribution animation are generated locally so the profile displays working assets immediately.

To refresh them locally, sign in with GitHub CLI, run `npm ci`, then run `npm run refresh`. Publish the updated SVG files afterward. The script reads the GitHub credential from the CLI and never writes it to the repository. Automatic daily updates can run once GitHub's account restriction is resolved.

## Editing

- Update the biography and project links in README.md.
- Edit the SVG files to change the palette, toolkit labels, or project card copy.
- Replace assets/banner.png to change the illustration. Keep a panoramic composition for the current layout.
- Keep this repository public and named misaka15135 for GitHub to display its README on the profile.

## Illustration provenance

The banner was generated with the built-in image_gen tool, using the account's existing public avatar as a character reference. The reference preserves the silver-gray hair, violet eyes, red glasses, white shirt, blue tie, and dark outer clothing.

Generation prompt:

```text
Use case: stylized-concept
Asset type: wide anime illustration banner for the GitHub profile of misaka15135.
Input image 1: character identity reference from the user's current GitHub avatar. Generate a new illustration; the reference is not an image to preserve pixel-for-pixel.
Primary request: create a polished, cinematic anime profile banner featuring the SAME character as the reference. Faithfully preserve her silver-gray hair with long side locks, violet eyes, distinctive red rectangular eyeglasses, white collared shirt, blue tie, and dark outer clothing. Do not substitute a different character. Calm, intelligent expression; tasteful shoulders-and-head framing, nonsexual.
Scene/backdrop: atmospheric blue and violet city lights at night, gentle luminous particles, subtle star-like accents. Refined anime key visual, crisp linework and soft painted lighting.
Composition: panoramic 3:1 composition, 2400 by 800 if possible. Character on the right half, fully visible head with comfortable margins. Leave a clean dark blue area across the left half for future profile typography. Her face and red glasses must remain clearly readable at GitHub's small displayed size.
Lighting/mood: soft cyan rim light, restrained violet glows, cozy futuristic evening. Match the red glasses accent.
Constraints: no text, no logos, no watermark, no UI, no additional people, no sexualization, no distorted glasses or anatomy. The final artwork must feel complete without added text.
```

SVG decorations and project cards are editable native assets. Project descriptions were checked against the public repositories during setup.
