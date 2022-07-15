# read-file-shebang

[![Build Status][github_actions_badge]][github_actions_link]
[![Coverage][coveralls_badge]][coveralls_link]
[![Npm Version][package_version_badge]][package_link]
[![MIT License][license_badge]][license_link]

[github_actions_badge]: https://img.shields.io/github/workflow/status/fisker/read-file-shebang/CI/master?style=flat-square
[github_actions_link]: https://github.com/fisker/read-file-shebang/actions?query=branch%3Amaster
[coveralls_badge]: https://img.shields.io/coveralls/github/fisker/read-file-shebang/master?style=flat-square
[coveralls_link]: https://coveralls.io/github/fisker/read-file-shebang?branch=master
[license_badge]: https://img.shields.io/npm/l/read-file-shebang.svg?style=flat-square
[license_link]: https://github.com/fisker/read-file-shebang/blob/master/license
[package_version_badge]: https://img.shields.io/npm/v/read-file-shebang.svg?style=flat-square
[package_link]: https://www.npmjs.com/package/read-file-shebang

> Read shebang from a file

## Install

```bash
yarn add read-file-shebang
```

## Usage

```js
import readShebang from 'read-file-shebang'

console.log(await readShebang('/path/to/file'))

// -> #!/usr/bin/env node
```
