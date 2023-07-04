# Playalong (with Chordfinder)

Playalong application which incorporates ChordFinder as the audio player for the backing track.

## Donwload project from Github

- With git:

```
git clone https://github.com/NeoklisMimidis/playalong3.git
```

## Deployment

Playalong is hosted on [Netlify](https://playalong3.netlify.app/) with continuous integration from github.

## Prerequisites

- Install [Node](https://nodejs.org/en/download)

## Setup instructions

- Installing dependencies

```
npm install
```

or

```
npm i
```

- Start development server

```
npm run dev
```

- Build the application (necessary for MusiColab server)

```
npm run build
```

## Vite notes

- Vite works with [ES modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules). Every JavaScript file in `src` directory must be a module (`type="module"`) to be bundled by Vite.
- Static files live in `public` directory. These files CANNOT be imported from JavaScript.
- Use root absolute path when referencing static files from HTML. E.g. to load `public/js/app.js` the path should be `/js/app.js`. **Note**: this is very important especially if project `base` path has been changed or Vite won't be able to find these files.
- To import static assets from JavaScript modules (omit the `.href` property if a `URL` object is required):
    ```javascript
    // Create a worker using a URL object
    const worker = new Worker(new URL('./metronomeworker.js', import.meta.url));

    // Resolve the path to img.png as a string
    const imgUrl = new URL('./img.png', import.meta.url).href
    ```
- Read more: https://vitejs.dev/guide/features.html