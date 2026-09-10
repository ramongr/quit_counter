# Quit Counter

A playful counter showing how long it has been since Lúcia should have quit her job, counting from **October 11, 2024**.

Built with plain HTML, CSS, and JavaScript. The page includes a live counter, a flying Nyan Cat with a rainbow trail, and an interactive “Are you Lúcia?” dialog with celebration and motivational GIF outcomes.

## Local development

### Prerequisites

- A modern web browser.
- Python 3 for the local preview server below.
- Node.js **24.8.0 or newer** and npm for the lint tools. The repository's `mise.toml` selects the latest Node.js if you use mise.

### Get the code and preview it

```sh
git clone https://github.com/ramongr/quit_counter.git
cd quit_counter
python3 -m http.server 8000 --bind 127.0.0.1
```

If you already have the repository, run the server command from its root directory.

Open **http://127.0.0.1:8000** in your browser. Edit `index.html`, `styles.css`, or `app.js`, then refresh to see your changes. Stop the server with **Ctrl+C**.

The site runs directly from its source files; there is no build step, backend, or environment configuration. npm dependencies are only needed for linting.

### Install development tools and run checks

In another terminal, from the repository root:

```sh
npm ci
npm run lint
```

Available commands:

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run both HTML and JavaScript checks. |
| `npm run lint:html` | Validate `index.html` with html-validate. |
| `npm run lint:js` | Lint JavaScript with Oxlint. |
| `npm run lint:fix` | Apply automatic JavaScript lint fixes. |

GitHub Actions runs `npm ci` and `npm run lint` on pull requests and pushes to `main`. There is currently no automated browser or unit test suite.

## Try it out

1. Confirm the counter displays years, months, days, hours, minutes, and seconds and updates every second.
2. Wait about one second for the “Are you Lúcia?” dialog, then try each path:

   | First answer | Follow-up answer | Result |
   | --- | --- | --- |
   | Yes | Yes — already quit | Celebration overlay with fireworks. |
   | Yes | No — haven't quit | Motivational GIF overlay and an attempt to open Indeed in a new tab; browser popup settings may affect this. |
   | No | Yes — will ask her | Celebration overlay with fireworks. |
   | No | No — won't ask her | Dialog closes. |

3. Close result overlays with their close button or **Escape**. Escape in the question dialog follows the “No” branch.
4. Resize the browser or use mobile device emulation to check the layout and the cat's rainbow trail.
5. Enable reduced motion in your system or browser developer tools, then reload: the flying cat and fireworks should be disabled.

### Replay the dialog

Once a dialog path is completed, it is remembered for the current tab's session. Refreshing alone will not show it again. To reset it, run this in the browser's developer console, then repeat for each path you want to test:

```js
sessionStorage.removeItem("quitDialogShown");
location.reload();
```

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Counter markup, inline cat SVG, and dialog overlays. |
| `styles.css` | Layout, styling, and reduced-motion rules. |
| `app.js` | Time calculations, cat animation, dialog flow, and fireworks. |
| `just_quit.gif` | Image used by the motivational overlay. |
| `package.json` / `package-lock.json` | Lint commands and locked development dependencies. |
| `.htmlvalidate.json` / `.oxlintrc.json` | Linter configuration. |
| `.github/workflows/lint.yml` | CI lint checks. |
| `mise.toml` | Local tool version configuration. |

## Customize the counter

Change `startDate` at the top of `app.js` to adjust the starting date. The current value, `2024-10-11T00:00:00`, is interpreted in the browser's local time zone. Update the “Counting since” text in `index.html` to match, and edit the title and heading there to personalize the page.
