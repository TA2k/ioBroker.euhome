"use strict";

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const axios = require("axios").default;
const Json2iob = require("json2iob");
const TuyAPI = require("tuyapi");
const TuyaCloud = require("./lib/tuyaCloud");

class Euhome extends utils.Adapter {
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  constructor(options) {
    super({
      ...options,
      name: "euhome",
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.deviceArray = [];
    this.tuyaDevices = {};
    this.devices = {};
    this.tuyaCloud = {};
    this.updateInterval = null;
    this.reLoginTimeout = null;
    this.refreshTokenTimeout = null;
    this.session = {};
    this.json2iob = new Json2iob(this);
    this.requestClient = axios.create();
    this.descriptions = {
      1: "POWER",
      2: "PLAY_PAUSE",
      3: "DIRECTION",
      5: "WORK_MODE",
      15: "WORK_STATUS",
      101: "GO_HOME",
      102: "CLEAN_SPEED",
      103: "FIND_ROBOT",
      104: "BATTERY_LEVEL",
      106: "ERROR_CODE",
      107: "DND",
      110: "CLEANING_AREA",
      109: "CLEANING_TIME",
      118: "BOOST_IQ",
      135: "AUTO_RETURN",
      142: "CONSUMABLES",
      116: "CONSUMABLES",
    };
  }

  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    // Reset the connection indicator during startup
    this.setState("info.connection", false, true);
    // if (this.config.interval < 0.5) {
    //   this.log.info("Set interval to minimum 0.5");
    //   this.config.interval = 0.5;
    // }
    if (!this.config.username || !this.config.password) {
      this.log.error("Please set username and password in the instance settings");
      return;
    }

    this.subscribeStates("*");

    this.log.info("Login to Eufy Home");
    const sid = await this.login();
    if (sid) {
      await this.getDeviceList();
      await this.updateDevices();
      this.updateInterval = setInterval(async () => {
        await this.updateDevices();
      }, 5 * 60 * 1000);
    }
    this.refreshTokenInterval = setInterval(() => {
      this.refreshToken();
    }, 24 * 60 * 60 * 1000);
  }
  async login() {
    await this.requestClient({
      method: "post",
      url: "https://home-api.eufylife.com/v1/user/email/login",
      headers: {
        category: "Home",
        Accept: "*/*",
        openudid: "d0cb96521c97deb758a64dfd4ef0962ac2241e2c",
        "Accept-Language": "de-DE;q=1, uk-DE;q=0.9, en-DE;q=0.8",
        "Content-Type": "application/json",
        clientType: "1",
        language: "de",
        "User-Agent": "EufyHome-iOS-2.14.0-6",
        timezone: "Europe/Berlin",
        country: "DE",
        Connection: "keep-alive",
      },
      data: {
        email: this.config.username,
        password: this.config.password,
        client_id: "eufyhome-app",
        client_secret: "GQCpr9dSp3uQpsOMgJ4xQ",
      },
    })
      .then((res) => {
        //  this.log.debug(JSON.stringify(res.data));
        if (res.data.access_token) {
          this.log.info("Login successful");
          this.session = res.data;
          this.setState("info.connection", true, true);
        } else {
          this.log.error("Login failed: " + JSON.stringify(res.data));
          return;
        }
      })
      .catch((error) => {
        this.log.error(error);
        this.log.error("Login failed");
        error.response && this.log.error(JSON.stringify(error.response.data));
      });

    this.tuyaCloud = new TuyaCloud({
      adapter: this,
      key: "yx5v9uc3ef9wg3v9atje",
      secret: "s8x78u7xwymasd9kqa7a73pjhxqsedaj",
      secret2: "cepev5pfnhua4dkqkdpmnrdxx378mpjr",
      certSign: "A",
      apiEtVersion: "0.0.1",
      region: "EU",
      ttid: "android",
    });
    if (!this.session.user_id) {
      this.log.error("No user_id found");
      return;
    }
    const sid = await this.tuyaCloud
      .loginEx({
        email: this.config.username,
        password: this.config.password,
        uid: this.session.user_id,
        returnFullLoginResponse: "false",
      })
      .catch((error) => {
        this.log.error(error);
        this.log.error("Login failed");
      });
    return sid;
  }

  async getDeviceList() {
    const groups = await this.tuyaCloud.request({ action: "tuya.m.location.list" });
    for (const group of groups) {
      this.log.debug(`Group: ${group.name} (${group.groupId})`);
      const devicesArr = await this.tuyaCloud.request({ action: "tuya.m.my.group.device.list", gid: group.groupId });
      this.log.info(`Found ${devicesArr.length} devices`);
      for (const device of devicesArr) {
        this.log.info(`Device: ${device.name} (${device.devId})`);
        const id = device.devId;

        this.devices[id] = device;
        this.deviceArray.push(device);
        const name = device.name;

        await this.setObjectNotExistsAsync(id, {
          type: "device",
          common: {
            name: name,
          },
          native: {},
        });
        await this.setObjectNotExistsAsync(id + ".remote", {
          type: "channel",
          common: {
            name: "Remote Controls",
          },
          native: {},
        });

        const remoteArray = [{ command: "Refresh", name: "True = Refresh" }];
        remoteArray.forEach((remote) => {
          this.setObjectNotExists(id + ".remote." + remote.command, {
            type: "state",
            common: {
              name: remote.name || "",
              type: remote.type || "boolean",
              role: remote.role || "button",
              def: remote.def != null ? remote.def : false,
              write: true,
              read: true,
            },
            native: {},
          });
        });
        await this.json2iob.parse(id, device, { forceIndex: true, write: true, descriptions: this.descriptions });
        this.connectLocal(id, device.localKey);
      }
    }
  }

  async connectLocal(id, localKey) {
    this.log.debug(`Connecting to ${id} with localKey ${localKey}`);
    try {
      const device = new TuyAPI({
        id: id,
        key: localKey,
        version: "3.3",
        issueRefreshOnConnect: true,
      });
      this.tuyaDevices[id] = device;
      device
        .find({ timeout: 30, all: true })
        .then((data) => {
          this.log.info(`Found devices ${JSON.stringify(data)}`);
        })
        .catch((error) => {
          this.log.error(`Error All! ${error}`);
        });

      device
        .find()
        .then(() => {
          // Connect to device
          device.connect();
        })
        .catch((error) => {
          this.log.error(`Error! ${error}`);
        });

      // Add event listeners
      device.on("connected", () => {
        this.log.info("Connected to device!");
      });

      device.on("disconnected", () => {
        this.log.info("Disconnected from device. Reconnect in 30s");
        this.reconnectTimeout = setTimeout(() => {
          if (!device.isConnected()) {
            this.log.info("Reconnecting to device...");
            device.connect();
          }
        }, 30000);
      });

      device.on("error", (error) => {
        this.log.error(`Error! ${error}`);
      });
      device.on("dp-refresh", (data) => {
        this.log.info(data);
        this.json2iob.parse(id, data, { forceIndex: true, write: true, descriptions: this.descriptions });
      });

      device.on("data", (data) => {
        this.log.info(data);
        this.json2iob.parse(id, data, { forceIndex: true, write: true, descriptions: this.descriptions });

        // // Set default property to opposite
        // if (!stateHasChanged) {
        //   device.set({ set: !data.dps["1"] });

        //   // Otherwise we'll be stuck in an endless
        //   // loop of toggling the state.
        //   stateHasChanged = true;
      });
    } catch (error) {
      this.log.error(`Error connecting to ${id}: ${error}`);
      this.log.error(error.stack);
    }
  }
  async updateDevices() {}

  async refreshToken() {
    this.log.debug("Refresh token");
    await this.login();
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   * @param {() => void} callback
   */
  onUnload(callback) {
    try {
      this.setState("info.connection", false, true);
      this.reLoginTimeout && clearTimeout(this.reLoginTimeout);
      this.refreshTokenTimeout && clearTimeout(this.refreshTokenTimeout);
      this.updateInterval && clearInterval(this.updateInterval);
      this.refreshTokenInterval && clearInterval(this.refreshTokenInterval);
      callback();
    } catch (e) {
      callback();
    }
  }

  /**
   * Is called if a subscribed state changes
   * @param {string} id
   * @param {ioBroker.State | null | undefined} state
   */
  async onStateChange(id, state) {
    if (state) {
      if (!state.ack) {
        const deviceId = id.split(".")[2];
        const folder = id.split(".")[3];
        const command = id.split(".")[4];
        if (folder !== "dps" && command !== "Refresh") {
          return;
        }
        const device = this.tuyaDevices[deviceId];
        if (id.split(".")[4] === "Refresh") {
          this.updateDevices();
          return;
        }
        if (!device.isConnected()) {
          await device.connect().catch((error) => {
            this.log.error(`Error! ${error}`);
          });
        }
        await device.set({ dps: parseInt(command), set: state.val }).catch((error) => {
          this.log.error(`Error! ${error}`);
        });
        this.refreshTimeout = setTimeout(() => {
          device.refresh().catch((error) => {
            this.log.error(`Error! ${error}`);
          });
        }, 5000);
      } else {
        // const idArray = id.split(".");
        // const command = id.split(".")[3];
        // const stateName = idArray[idArray.length - 1];
        // const deviceId = id.split(".")[2];
        // if (command === "remote") {
        //   return;
        // }
        // const resultDict = {
        //   onOff: "turn",
        //   turn: "turn",
        //   brightness: "brightness",
        //   r: "r",
        //   g: "g",
        //   b: "b",
        //   colorTemInKelvin: "colorwc",
        // };
        // if (resultDict[stateName]) {
        //   const value = state.val;
        //   await this.setStateAsync(deviceId + ".remote." + resultDict[stateName], value, true);
        // }
      }
    }
  }
}

if (require.main !== module) {
  // Export the constructor in compact mode
  /**
   * @param {Partial<utils.AdapterOptions>} [options={}]
   */
  module.exports = (options) => new Euhome(options);
} else {
  // otherwise start the instance directly
  new Euhome();
}
