![Logo](admin/euhome.png)

# ioBroker.euhome

[![NPM version](https://img.shields.io/npm/v/iobroker.euhome.svg)](https://www.npmjs.com/package/iobroker.euhome)
[![Downloads](https://img.shields.io/npm/dm/iobroker.euhome.svg)](https://www.npmjs.com/package/iobroker.euhome)
![Number of Installations](https://iobroker.live/badges/euhome-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/euhome-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.euhome.png?downloads=true)](https://nodei.co/npm/iobroker.euhome/)

**Tests:** ![Test and Release](https://github.com/TA2k/ioBroker.euhome/workflows/Test%20and%20Release/badge.svg)

## euhome adapter for ioBroker

Adapter for e-Home devices like Robovac

## Loginablauf

Die e-Home Mail und Passwort eingeben.

## Status

euhome.0.id.dps.

## Steuern

euhome.0.id.dps.

Raumreinigung
euhome.0.id.remote.sendCommand
damit kann man dann

```
{
  "method": "selectRoomsClean",
  "data": {
    "roomIds": [
      2
    ],
    "cleanTimes": 1
  }
}
```

## Diskussion und Fragen

<https://forum.iobroker.net/topic/62168/test-adapter-eufy-home-robovac>

## Changelog

### 0.0.3

- (TA2k) initial release

## License

MIT License

Copyright (c) 2023 TA2k <tombox2020@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
