# EZ Web Audio

_Note: THIS IS A WORK IN PROGRESS! Not ready for use!!_

## Making the Web Audio API super EZ since 2024

EZ Web Audio is a lightweight audio library for the web. It is designed to be easy to use and to provide a simple API for common audio tasks. It is written in TypeScript and has no dependencies.

EZ Web Audio was originally [Ember Audio](https://sethbrasile.github.io/ember-audio) and it was developed before vue and react rose to prominence. This is a full rewrite in vanilla typescript that will expose a similar-ish API to "Ember Audio"

## Release Process

To publish a new version:

1. Update version in package.json:
   ```bash
   npm version patch  # or minor/major
   ```

2. Push the tag:
   ```bash
   git push --follow-tags
   ```

3. GitHub Actions will automatically:
   - Run tests
   - Build the library
   - Publish to npm with provenance

The package will be available at: https://www.npmjs.com/package/ez-web-audio
