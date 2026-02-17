#!/usr/bin/env bun
// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __require = import.meta.require;

// node_modules/delayed-stream/lib/delayed_stream.js
var require_delayed_stream = __commonJS((exports, module) => {
  var Stream = __require("stream").Stream;
  var util = __require("util");
  module.exports = DelayedStream;
  function DelayedStream() {
    this.source = null;
    this.dataSize = 0;
    this.maxDataSize = 1024 * 1024;
    this.pauseStream = true;
    this._maxDataSizeExceeded = false;
    this._released = false;
    this._bufferedEvents = [];
  }
  util.inherits(DelayedStream, Stream);
  DelayedStream.create = function(source, options) {
    var delayedStream = new this;
    options = options || {};
    for (var option in options) {
      delayedStream[option] = options[option];
    }
    delayedStream.source = source;
    var realEmit = source.emit;
    source.emit = function() {
      delayedStream._handleEmit(arguments);
      return realEmit.apply(source, arguments);
    };
    source.on("error", function() {});
    if (delayedStream.pauseStream) {
      source.pause();
    }
    return delayedStream;
  };
  Object.defineProperty(DelayedStream.prototype, "readable", {
    configurable: true,
    enumerable: true,
    get: function() {
      return this.source.readable;
    }
  });
  DelayedStream.prototype.setEncoding = function() {
    return this.source.setEncoding.apply(this.source, arguments);
  };
  DelayedStream.prototype.resume = function() {
    if (!this._released) {
      this.release();
    }
    this.source.resume();
  };
  DelayedStream.prototype.pause = function() {
    this.source.pause();
  };
  DelayedStream.prototype.release = function() {
    this._released = true;
    this._bufferedEvents.forEach(function(args) {
      this.emit.apply(this, args);
    }.bind(this));
    this._bufferedEvents = [];
  };
  DelayedStream.prototype.pipe = function() {
    var r = Stream.prototype.pipe.apply(this, arguments);
    this.resume();
    return r;
  };
  DelayedStream.prototype._handleEmit = function(args) {
    if (this._released) {
      this.emit.apply(this, args);
      return;
    }
    if (args[0] === "data") {
      this.dataSize += args[1].length;
      this._checkIfMaxDataSizeExceeded();
    }
    this._bufferedEvents.push(args);
  };
  DelayedStream.prototype._checkIfMaxDataSizeExceeded = function() {
    if (this._maxDataSizeExceeded) {
      return;
    }
    if (this.dataSize <= this.maxDataSize) {
      return;
    }
    this._maxDataSizeExceeded = true;
    var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this.emit("error", new Error(message));
  };
});

// node_modules/combined-stream/lib/combined_stream.js
var require_combined_stream = __commonJS((exports, module) => {
  var util = __require("util");
  var Stream = __require("stream").Stream;
  var DelayedStream = require_delayed_stream();
  module.exports = CombinedStream;
  function CombinedStream() {
    this.writable = false;
    this.readable = true;
    this.dataSize = 0;
    this.maxDataSize = 2 * 1024 * 1024;
    this.pauseStreams = true;
    this._released = false;
    this._streams = [];
    this._currentStream = null;
    this._insideLoop = false;
    this._pendingNext = false;
  }
  util.inherits(CombinedStream, Stream);
  CombinedStream.create = function(options) {
    var combinedStream = new this;
    options = options || {};
    for (var option in options) {
      combinedStream[option] = options[option];
    }
    return combinedStream;
  };
  CombinedStream.isStreamLike = function(stream) {
    return typeof stream !== "function" && typeof stream !== "string" && typeof stream !== "boolean" && typeof stream !== "number" && !Buffer.isBuffer(stream);
  };
  CombinedStream.prototype.append = function(stream) {
    var isStreamLike = CombinedStream.isStreamLike(stream);
    if (isStreamLike) {
      if (!(stream instanceof DelayedStream)) {
        var newStream = DelayedStream.create(stream, {
          maxDataSize: Infinity,
          pauseStream: this.pauseStreams
        });
        stream.on("data", this._checkDataSize.bind(this));
        stream = newStream;
      }
      this._handleErrors(stream);
      if (this.pauseStreams) {
        stream.pause();
      }
    }
    this._streams.push(stream);
    return this;
  };
  CombinedStream.prototype.pipe = function(dest, options) {
    Stream.prototype.pipe.call(this, dest, options);
    this.resume();
    return dest;
  };
  CombinedStream.prototype._getNext = function() {
    this._currentStream = null;
    if (this._insideLoop) {
      this._pendingNext = true;
      return;
    }
    this._insideLoop = true;
    try {
      do {
        this._pendingNext = false;
        this._realGetNext();
      } while (this._pendingNext);
    } finally {
      this._insideLoop = false;
    }
  };
  CombinedStream.prototype._realGetNext = function() {
    var stream = this._streams.shift();
    if (typeof stream == "undefined") {
      this.end();
      return;
    }
    if (typeof stream !== "function") {
      this._pipeNext(stream);
      return;
    }
    var getStream = stream;
    getStream(function(stream2) {
      var isStreamLike = CombinedStream.isStreamLike(stream2);
      if (isStreamLike) {
        stream2.on("data", this._checkDataSize.bind(this));
        this._handleErrors(stream2);
      }
      this._pipeNext(stream2);
    }.bind(this));
  };
  CombinedStream.prototype._pipeNext = function(stream) {
    this._currentStream = stream;
    var isStreamLike = CombinedStream.isStreamLike(stream);
    if (isStreamLike) {
      stream.on("end", this._getNext.bind(this));
      stream.pipe(this, { end: false });
      return;
    }
    var value = stream;
    this.write(value);
    this._getNext();
  };
  CombinedStream.prototype._handleErrors = function(stream) {
    var self2 = this;
    stream.on("error", function(err) {
      self2._emitError(err);
    });
  };
  CombinedStream.prototype.write = function(data) {
    this.emit("data", data);
  };
  CombinedStream.prototype.pause = function() {
    if (!this.pauseStreams) {
      return;
    }
    if (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function")
      this._currentStream.pause();
    this.emit("pause");
  };
  CombinedStream.prototype.resume = function() {
    if (!this._released) {
      this._released = true;
      this.writable = true;
      this._getNext();
    }
    if (this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function")
      this._currentStream.resume();
    this.emit("resume");
  };
  CombinedStream.prototype.end = function() {
    this._reset();
    this.emit("end");
  };
  CombinedStream.prototype.destroy = function() {
    this._reset();
    this.emit("close");
  };
  CombinedStream.prototype._reset = function() {
    this.writable = false;
    this._streams = [];
    this._currentStream = null;
  };
  CombinedStream.prototype._checkDataSize = function() {
    this._updateDataSize();
    if (this.dataSize <= this.maxDataSize) {
      return;
    }
    var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this._emitError(new Error(message));
  };
  CombinedStream.prototype._updateDataSize = function() {
    this.dataSize = 0;
    var self2 = this;
    this._streams.forEach(function(stream) {
      if (!stream.dataSize) {
        return;
      }
      self2.dataSize += stream.dataSize;
    });
    if (this._currentStream && this._currentStream.dataSize) {
      this.dataSize += this._currentStream.dataSize;
    }
  };
  CombinedStream.prototype._emitError = function(err) {
    this._reset();
    this.emit("error", err);
  };
});

// node_modules/mime-db/db.json
var require_db = __commonJS((exports, module) => {
  module.exports = {
    "application/1d-interleaved-parityfec": {
      source: "iana"
    },
    "application/3gpdash-qoe-report+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/3gpp-ims+xml": {
      source: "iana",
      compressible: true
    },
    "application/3gpphal+json": {
      source: "iana",
      compressible: true
    },
    "application/3gpphalforms+json": {
      source: "iana",
      compressible: true
    },
    "application/a2l": {
      source: "iana"
    },
    "application/ace+cbor": {
      source: "iana"
    },
    "application/activemessage": {
      source: "iana"
    },
    "application/activity+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-costmap+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-costmapfilter+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-directory+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-endpointcost+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-endpointcostparams+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-endpointprop+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-endpointpropparams+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-error+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-networkmap+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-networkmapfilter+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-updatestreamcontrol+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-updatestreamparams+json": {
      source: "iana",
      compressible: true
    },
    "application/aml": {
      source: "iana"
    },
    "application/andrew-inset": {
      source: "iana",
      extensions: ["ez"]
    },
    "application/applefile": {
      source: "iana"
    },
    "application/applixware": {
      source: "apache",
      extensions: ["aw"]
    },
    "application/at+jwt": {
      source: "iana"
    },
    "application/atf": {
      source: "iana"
    },
    "application/atfx": {
      source: "iana"
    },
    "application/atom+xml": {
      source: "iana",
      compressible: true,
      extensions: ["atom"]
    },
    "application/atomcat+xml": {
      source: "iana",
      compressible: true,
      extensions: ["atomcat"]
    },
    "application/atomdeleted+xml": {
      source: "iana",
      compressible: true,
      extensions: ["atomdeleted"]
    },
    "application/atomicmail": {
      source: "iana"
    },
    "application/atomsvc+xml": {
      source: "iana",
      compressible: true,
      extensions: ["atomsvc"]
    },
    "application/atsc-dwd+xml": {
      source: "iana",
      compressible: true,
      extensions: ["dwd"]
    },
    "application/atsc-dynamic-event-message": {
      source: "iana"
    },
    "application/atsc-held+xml": {
      source: "iana",
      compressible: true,
      extensions: ["held"]
    },
    "application/atsc-rdt+json": {
      source: "iana",
      compressible: true
    },
    "application/atsc-rsat+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rsat"]
    },
    "application/atxml": {
      source: "iana"
    },
    "application/auth-policy+xml": {
      source: "iana",
      compressible: true
    },
    "application/bacnet-xdd+zip": {
      source: "iana",
      compressible: false
    },
    "application/batch-smtp": {
      source: "iana"
    },
    "application/bdoc": {
      compressible: false,
      extensions: ["bdoc"]
    },
    "application/beep+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/calendar+json": {
      source: "iana",
      compressible: true
    },
    "application/calendar+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xcs"]
    },
    "application/call-completion": {
      source: "iana"
    },
    "application/cals-1840": {
      source: "iana"
    },
    "application/captive+json": {
      source: "iana",
      compressible: true
    },
    "application/cbor": {
      source: "iana"
    },
    "application/cbor-seq": {
      source: "iana"
    },
    "application/cccex": {
      source: "iana"
    },
    "application/ccmp+xml": {
      source: "iana",
      compressible: true
    },
    "application/ccxml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["ccxml"]
    },
    "application/cdfx+xml": {
      source: "iana",
      compressible: true,
      extensions: ["cdfx"]
    },
    "application/cdmi-capability": {
      source: "iana",
      extensions: ["cdmia"]
    },
    "application/cdmi-container": {
      source: "iana",
      extensions: ["cdmic"]
    },
    "application/cdmi-domain": {
      source: "iana",
      extensions: ["cdmid"]
    },
    "application/cdmi-object": {
      source: "iana",
      extensions: ["cdmio"]
    },
    "application/cdmi-queue": {
      source: "iana",
      extensions: ["cdmiq"]
    },
    "application/cdni": {
      source: "iana"
    },
    "application/cea": {
      source: "iana"
    },
    "application/cea-2018+xml": {
      source: "iana",
      compressible: true
    },
    "application/cellml+xml": {
      source: "iana",
      compressible: true
    },
    "application/cfw": {
      source: "iana"
    },
    "application/city+json": {
      source: "iana",
      compressible: true
    },
    "application/clr": {
      source: "iana"
    },
    "application/clue+xml": {
      source: "iana",
      compressible: true
    },
    "application/clue_info+xml": {
      source: "iana",
      compressible: true
    },
    "application/cms": {
      source: "iana"
    },
    "application/cnrp+xml": {
      source: "iana",
      compressible: true
    },
    "application/coap-group+json": {
      source: "iana",
      compressible: true
    },
    "application/coap-payload": {
      source: "iana"
    },
    "application/commonground": {
      source: "iana"
    },
    "application/conference-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/cose": {
      source: "iana"
    },
    "application/cose-key": {
      source: "iana"
    },
    "application/cose-key-set": {
      source: "iana"
    },
    "application/cpl+xml": {
      source: "iana",
      compressible: true,
      extensions: ["cpl"]
    },
    "application/csrattrs": {
      source: "iana"
    },
    "application/csta+xml": {
      source: "iana",
      compressible: true
    },
    "application/cstadata+xml": {
      source: "iana",
      compressible: true
    },
    "application/csvm+json": {
      source: "iana",
      compressible: true
    },
    "application/cu-seeme": {
      source: "apache",
      extensions: ["cu"]
    },
    "application/cwt": {
      source: "iana"
    },
    "application/cybercash": {
      source: "iana"
    },
    "application/dart": {
      compressible: true
    },
    "application/dash+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mpd"]
    },
    "application/dash-patch+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mpp"]
    },
    "application/dashdelta": {
      source: "iana"
    },
    "application/davmount+xml": {
      source: "iana",
      compressible: true,
      extensions: ["davmount"]
    },
    "application/dca-rft": {
      source: "iana"
    },
    "application/dcd": {
      source: "iana"
    },
    "application/dec-dx": {
      source: "iana"
    },
    "application/dialog-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/dicom": {
      source: "iana"
    },
    "application/dicom+json": {
      source: "iana",
      compressible: true
    },
    "application/dicom+xml": {
      source: "iana",
      compressible: true
    },
    "application/dii": {
      source: "iana"
    },
    "application/dit": {
      source: "iana"
    },
    "application/dns": {
      source: "iana"
    },
    "application/dns+json": {
      source: "iana",
      compressible: true
    },
    "application/dns-message": {
      source: "iana"
    },
    "application/docbook+xml": {
      source: "apache",
      compressible: true,
      extensions: ["dbk"]
    },
    "application/dots+cbor": {
      source: "iana"
    },
    "application/dskpp+xml": {
      source: "iana",
      compressible: true
    },
    "application/dssc+der": {
      source: "iana",
      extensions: ["dssc"]
    },
    "application/dssc+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xdssc"]
    },
    "application/dvcs": {
      source: "iana"
    },
    "application/ecmascript": {
      source: "iana",
      compressible: true,
      extensions: ["es", "ecma"]
    },
    "application/edi-consent": {
      source: "iana"
    },
    "application/edi-x12": {
      source: "iana",
      compressible: false
    },
    "application/edifact": {
      source: "iana",
      compressible: false
    },
    "application/efi": {
      source: "iana"
    },
    "application/elm+json": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/elm+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.cap+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/emergencycalldata.comment+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.control+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.deviceinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.ecall.msd": {
      source: "iana"
    },
    "application/emergencycalldata.providerinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.serviceinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.subscriberinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.veds+xml": {
      source: "iana",
      compressible: true
    },
    "application/emma+xml": {
      source: "iana",
      compressible: true,
      extensions: ["emma"]
    },
    "application/emotionml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["emotionml"]
    },
    "application/encaprtp": {
      source: "iana"
    },
    "application/epp+xml": {
      source: "iana",
      compressible: true
    },
    "application/epub+zip": {
      source: "iana",
      compressible: false,
      extensions: ["epub"]
    },
    "application/eshop": {
      source: "iana"
    },
    "application/exi": {
      source: "iana",
      extensions: ["exi"]
    },
    "application/expect-ct-report+json": {
      source: "iana",
      compressible: true
    },
    "application/express": {
      source: "iana",
      extensions: ["exp"]
    },
    "application/fastinfoset": {
      source: "iana"
    },
    "application/fastsoap": {
      source: "iana"
    },
    "application/fdt+xml": {
      source: "iana",
      compressible: true,
      extensions: ["fdt"]
    },
    "application/fhir+json": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/fhir+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/fido.trusted-apps+json": {
      compressible: true
    },
    "application/fits": {
      source: "iana"
    },
    "application/flexfec": {
      source: "iana"
    },
    "application/font-sfnt": {
      source: "iana"
    },
    "application/font-tdpfr": {
      source: "iana",
      extensions: ["pfr"]
    },
    "application/font-woff": {
      source: "iana",
      compressible: false
    },
    "application/framework-attributes+xml": {
      source: "iana",
      compressible: true
    },
    "application/geo+json": {
      source: "iana",
      compressible: true,
      extensions: ["geojson"]
    },
    "application/geo+json-seq": {
      source: "iana"
    },
    "application/geopackage+sqlite3": {
      source: "iana"
    },
    "application/geoxacml+xml": {
      source: "iana",
      compressible: true
    },
    "application/gltf-buffer": {
      source: "iana"
    },
    "application/gml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["gml"]
    },
    "application/gpx+xml": {
      source: "apache",
      compressible: true,
      extensions: ["gpx"]
    },
    "application/gxf": {
      source: "apache",
      extensions: ["gxf"]
    },
    "application/gzip": {
      source: "iana",
      compressible: false,
      extensions: ["gz"]
    },
    "application/h224": {
      source: "iana"
    },
    "application/held+xml": {
      source: "iana",
      compressible: true
    },
    "application/hjson": {
      extensions: ["hjson"]
    },
    "application/http": {
      source: "iana"
    },
    "application/hyperstudio": {
      source: "iana",
      extensions: ["stk"]
    },
    "application/ibe-key-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/ibe-pkg-reply+xml": {
      source: "iana",
      compressible: true
    },
    "application/ibe-pp-data": {
      source: "iana"
    },
    "application/iges": {
      source: "iana"
    },
    "application/im-iscomposing+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/index": {
      source: "iana"
    },
    "application/index.cmd": {
      source: "iana"
    },
    "application/index.obj": {
      source: "iana"
    },
    "application/index.response": {
      source: "iana"
    },
    "application/index.vnd": {
      source: "iana"
    },
    "application/inkml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["ink", "inkml"]
    },
    "application/iotp": {
      source: "iana"
    },
    "application/ipfix": {
      source: "iana",
      extensions: ["ipfix"]
    },
    "application/ipp": {
      source: "iana"
    },
    "application/isup": {
      source: "iana"
    },
    "application/its+xml": {
      source: "iana",
      compressible: true,
      extensions: ["its"]
    },
    "application/java-archive": {
      source: "apache",
      compressible: false,
      extensions: ["jar", "war", "ear"]
    },
    "application/java-serialized-object": {
      source: "apache",
      compressible: false,
      extensions: ["ser"]
    },
    "application/java-vm": {
      source: "apache",
      compressible: false,
      extensions: ["class"]
    },
    "application/javascript": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["js", "mjs"]
    },
    "application/jf2feed+json": {
      source: "iana",
      compressible: true
    },
    "application/jose": {
      source: "iana"
    },
    "application/jose+json": {
      source: "iana",
      compressible: true
    },
    "application/jrd+json": {
      source: "iana",
      compressible: true
    },
    "application/jscalendar+json": {
      source: "iana",
      compressible: true
    },
    "application/json": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["json", "map"]
    },
    "application/json-patch+json": {
      source: "iana",
      compressible: true
    },
    "application/json-seq": {
      source: "iana"
    },
    "application/json5": {
      extensions: ["json5"]
    },
    "application/jsonml+json": {
      source: "apache",
      compressible: true,
      extensions: ["jsonml"]
    },
    "application/jwk+json": {
      source: "iana",
      compressible: true
    },
    "application/jwk-set+json": {
      source: "iana",
      compressible: true
    },
    "application/jwt": {
      source: "iana"
    },
    "application/kpml-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/kpml-response+xml": {
      source: "iana",
      compressible: true
    },
    "application/ld+json": {
      source: "iana",
      compressible: true,
      extensions: ["jsonld"]
    },
    "application/lgr+xml": {
      source: "iana",
      compressible: true,
      extensions: ["lgr"]
    },
    "application/link-format": {
      source: "iana"
    },
    "application/load-control+xml": {
      source: "iana",
      compressible: true
    },
    "application/lost+xml": {
      source: "iana",
      compressible: true,
      extensions: ["lostxml"]
    },
    "application/lostsync+xml": {
      source: "iana",
      compressible: true
    },
    "application/lpf+zip": {
      source: "iana",
      compressible: false
    },
    "application/lxf": {
      source: "iana"
    },
    "application/mac-binhex40": {
      source: "iana",
      extensions: ["hqx"]
    },
    "application/mac-compactpro": {
      source: "apache",
      extensions: ["cpt"]
    },
    "application/macwriteii": {
      source: "iana"
    },
    "application/mads+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mads"]
    },
    "application/manifest+json": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["webmanifest"]
    },
    "application/marc": {
      source: "iana",
      extensions: ["mrc"]
    },
    "application/marcxml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mrcx"]
    },
    "application/mathematica": {
      source: "iana",
      extensions: ["ma", "nb", "mb"]
    },
    "application/mathml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mathml"]
    },
    "application/mathml-content+xml": {
      source: "iana",
      compressible: true
    },
    "application/mathml-presentation+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-associated-procedure-description+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-deregister+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-envelope+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-msk+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-msk-response+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-protection-description+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-reception-report+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-register+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-register-response+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-schedule+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-user-service-description+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbox": {
      source: "iana",
      extensions: ["mbox"]
    },
    "application/media-policy-dataset+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mpf"]
    },
    "application/media_control+xml": {
      source: "iana",
      compressible: true
    },
    "application/mediaservercontrol+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mscml"]
    },
    "application/merge-patch+json": {
      source: "iana",
      compressible: true
    },
    "application/metalink+xml": {
      source: "apache",
      compressible: true,
      extensions: ["metalink"]
    },
    "application/metalink4+xml": {
      source: "iana",
      compressible: true,
      extensions: ["meta4"]
    },
    "application/mets+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mets"]
    },
    "application/mf4": {
      source: "iana"
    },
    "application/mikey": {
      source: "iana"
    },
    "application/mipc": {
      source: "iana"
    },
    "application/missing-blocks+cbor-seq": {
      source: "iana"
    },
    "application/mmt-aei+xml": {
      source: "iana",
      compressible: true,
      extensions: ["maei"]
    },
    "application/mmt-usd+xml": {
      source: "iana",
      compressible: true,
      extensions: ["musd"]
    },
    "application/mods+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mods"]
    },
    "application/moss-keys": {
      source: "iana"
    },
    "application/moss-signature": {
      source: "iana"
    },
    "application/mosskey-data": {
      source: "iana"
    },
    "application/mosskey-request": {
      source: "iana"
    },
    "application/mp21": {
      source: "iana",
      extensions: ["m21", "mp21"]
    },
    "application/mp4": {
      source: "iana",
      extensions: ["mp4s", "m4p"]
    },
    "application/mpeg4-generic": {
      source: "iana"
    },
    "application/mpeg4-iod": {
      source: "iana"
    },
    "application/mpeg4-iod-xmt": {
      source: "iana"
    },
    "application/mrb-consumer+xml": {
      source: "iana",
      compressible: true
    },
    "application/mrb-publish+xml": {
      source: "iana",
      compressible: true
    },
    "application/msc-ivr+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/msc-mixer+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/msword": {
      source: "iana",
      compressible: false,
      extensions: ["doc", "dot"]
    },
    "application/mud+json": {
      source: "iana",
      compressible: true
    },
    "application/multipart-core": {
      source: "iana"
    },
    "application/mxf": {
      source: "iana",
      extensions: ["mxf"]
    },
    "application/n-quads": {
      source: "iana",
      extensions: ["nq"]
    },
    "application/n-triples": {
      source: "iana",
      extensions: ["nt"]
    },
    "application/nasdata": {
      source: "iana"
    },
    "application/news-checkgroups": {
      source: "iana",
      charset: "US-ASCII"
    },
    "application/news-groupinfo": {
      source: "iana",
      charset: "US-ASCII"
    },
    "application/news-transmission": {
      source: "iana"
    },
    "application/nlsml+xml": {
      source: "iana",
      compressible: true
    },
    "application/node": {
      source: "iana",
      extensions: ["cjs"]
    },
    "application/nss": {
      source: "iana"
    },
    "application/oauth-authz-req+jwt": {
      source: "iana"
    },
    "application/oblivious-dns-message": {
      source: "iana"
    },
    "application/ocsp-request": {
      source: "iana"
    },
    "application/ocsp-response": {
      source: "iana"
    },
    "application/octet-stream": {
      source: "iana",
      compressible: false,
      extensions: ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"]
    },
    "application/oda": {
      source: "iana",
      extensions: ["oda"]
    },
    "application/odm+xml": {
      source: "iana",
      compressible: true
    },
    "application/odx": {
      source: "iana"
    },
    "application/oebps-package+xml": {
      source: "iana",
      compressible: true,
      extensions: ["opf"]
    },
    "application/ogg": {
      source: "iana",
      compressible: false,
      extensions: ["ogx"]
    },
    "application/omdoc+xml": {
      source: "apache",
      compressible: true,
      extensions: ["omdoc"]
    },
    "application/onenote": {
      source: "apache",
      extensions: ["onetoc", "onetoc2", "onetmp", "onepkg"]
    },
    "application/opc-nodeset+xml": {
      source: "iana",
      compressible: true
    },
    "application/oscore": {
      source: "iana"
    },
    "application/oxps": {
      source: "iana",
      extensions: ["oxps"]
    },
    "application/p21": {
      source: "iana"
    },
    "application/p21+zip": {
      source: "iana",
      compressible: false
    },
    "application/p2p-overlay+xml": {
      source: "iana",
      compressible: true,
      extensions: ["relo"]
    },
    "application/parityfec": {
      source: "iana"
    },
    "application/passport": {
      source: "iana"
    },
    "application/patch-ops-error+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xer"]
    },
    "application/pdf": {
      source: "iana",
      compressible: false,
      extensions: ["pdf"]
    },
    "application/pdx": {
      source: "iana"
    },
    "application/pem-certificate-chain": {
      source: "iana"
    },
    "application/pgp-encrypted": {
      source: "iana",
      compressible: false,
      extensions: ["pgp"]
    },
    "application/pgp-keys": {
      source: "iana",
      extensions: ["asc"]
    },
    "application/pgp-signature": {
      source: "iana",
      extensions: ["asc", "sig"]
    },
    "application/pics-rules": {
      source: "apache",
      extensions: ["prf"]
    },
    "application/pidf+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/pidf-diff+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/pkcs10": {
      source: "iana",
      extensions: ["p10"]
    },
    "application/pkcs12": {
      source: "iana"
    },
    "application/pkcs7-mime": {
      source: "iana",
      extensions: ["p7m", "p7c"]
    },
    "application/pkcs7-signature": {
      source: "iana",
      extensions: ["p7s"]
    },
    "application/pkcs8": {
      source: "iana",
      extensions: ["p8"]
    },
    "application/pkcs8-encrypted": {
      source: "iana"
    },
    "application/pkix-attr-cert": {
      source: "iana",
      extensions: ["ac"]
    },
    "application/pkix-cert": {
      source: "iana",
      extensions: ["cer"]
    },
    "application/pkix-crl": {
      source: "iana",
      extensions: ["crl"]
    },
    "application/pkix-pkipath": {
      source: "iana",
      extensions: ["pkipath"]
    },
    "application/pkixcmp": {
      source: "iana",
      extensions: ["pki"]
    },
    "application/pls+xml": {
      source: "iana",
      compressible: true,
      extensions: ["pls"]
    },
    "application/poc-settings+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/postscript": {
      source: "iana",
      compressible: true,
      extensions: ["ai", "eps", "ps"]
    },
    "application/ppsp-tracker+json": {
      source: "iana",
      compressible: true
    },
    "application/problem+json": {
      source: "iana",
      compressible: true
    },
    "application/problem+xml": {
      source: "iana",
      compressible: true
    },
    "application/provenance+xml": {
      source: "iana",
      compressible: true,
      extensions: ["provx"]
    },
    "application/prs.alvestrand.titrax-sheet": {
      source: "iana"
    },
    "application/prs.cww": {
      source: "iana",
      extensions: ["cww"]
    },
    "application/prs.cyn": {
      source: "iana",
      charset: "7-BIT"
    },
    "application/prs.hpub+zip": {
      source: "iana",
      compressible: false
    },
    "application/prs.nprend": {
      source: "iana"
    },
    "application/prs.plucker": {
      source: "iana"
    },
    "application/prs.rdf-xml-crypt": {
      source: "iana"
    },
    "application/prs.xsf+xml": {
      source: "iana",
      compressible: true
    },
    "application/pskc+xml": {
      source: "iana",
      compressible: true,
      extensions: ["pskcxml"]
    },
    "application/pvd+json": {
      source: "iana",
      compressible: true
    },
    "application/qsig": {
      source: "iana"
    },
    "application/raml+yaml": {
      compressible: true,
      extensions: ["raml"]
    },
    "application/raptorfec": {
      source: "iana"
    },
    "application/rdap+json": {
      source: "iana",
      compressible: true
    },
    "application/rdf+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rdf", "owl"]
    },
    "application/reginfo+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rif"]
    },
    "application/relax-ng-compact-syntax": {
      source: "iana",
      extensions: ["rnc"]
    },
    "application/remote-printing": {
      source: "iana"
    },
    "application/reputon+json": {
      source: "iana",
      compressible: true
    },
    "application/resource-lists+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rl"]
    },
    "application/resource-lists-diff+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rld"]
    },
    "application/rfc+xml": {
      source: "iana",
      compressible: true
    },
    "application/riscos": {
      source: "iana"
    },
    "application/rlmi+xml": {
      source: "iana",
      compressible: true
    },
    "application/rls-services+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rs"]
    },
    "application/route-apd+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rapd"]
    },
    "application/route-s-tsid+xml": {
      source: "iana",
      compressible: true,
      extensions: ["sls"]
    },
    "application/route-usd+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rusd"]
    },
    "application/rpki-ghostbusters": {
      source: "iana",
      extensions: ["gbr"]
    },
    "application/rpki-manifest": {
      source: "iana",
      extensions: ["mft"]
    },
    "application/rpki-publication": {
      source: "iana"
    },
    "application/rpki-roa": {
      source: "iana",
      extensions: ["roa"]
    },
    "application/rpki-updown": {
      source: "iana"
    },
    "application/rsd+xml": {
      source: "apache",
      compressible: true,
      extensions: ["rsd"]
    },
    "application/rss+xml": {
      source: "apache",
      compressible: true,
      extensions: ["rss"]
    },
    "application/rtf": {
      source: "iana",
      compressible: true,
      extensions: ["rtf"]
    },
    "application/rtploopback": {
      source: "iana"
    },
    "application/rtx": {
      source: "iana"
    },
    "application/samlassertion+xml": {
      source: "iana",
      compressible: true
    },
    "application/samlmetadata+xml": {
      source: "iana",
      compressible: true
    },
    "application/sarif+json": {
      source: "iana",
      compressible: true
    },
    "application/sarif-external-properties+json": {
      source: "iana",
      compressible: true
    },
    "application/sbe": {
      source: "iana"
    },
    "application/sbml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["sbml"]
    },
    "application/scaip+xml": {
      source: "iana",
      compressible: true
    },
    "application/scim+json": {
      source: "iana",
      compressible: true
    },
    "application/scvp-cv-request": {
      source: "iana",
      extensions: ["scq"]
    },
    "application/scvp-cv-response": {
      source: "iana",
      extensions: ["scs"]
    },
    "application/scvp-vp-request": {
      source: "iana",
      extensions: ["spq"]
    },
    "application/scvp-vp-response": {
      source: "iana",
      extensions: ["spp"]
    },
    "application/sdp": {
      source: "iana",
      extensions: ["sdp"]
    },
    "application/secevent+jwt": {
      source: "iana"
    },
    "application/senml+cbor": {
      source: "iana"
    },
    "application/senml+json": {
      source: "iana",
      compressible: true
    },
    "application/senml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["senmlx"]
    },
    "application/senml-etch+cbor": {
      source: "iana"
    },
    "application/senml-etch+json": {
      source: "iana",
      compressible: true
    },
    "application/senml-exi": {
      source: "iana"
    },
    "application/sensml+cbor": {
      source: "iana"
    },
    "application/sensml+json": {
      source: "iana",
      compressible: true
    },
    "application/sensml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["sensmlx"]
    },
    "application/sensml-exi": {
      source: "iana"
    },
    "application/sep+xml": {
      source: "iana",
      compressible: true
    },
    "application/sep-exi": {
      source: "iana"
    },
    "application/session-info": {
      source: "iana"
    },
    "application/set-payment": {
      source: "iana"
    },
    "application/set-payment-initiation": {
      source: "iana",
      extensions: ["setpay"]
    },
    "application/set-registration": {
      source: "iana"
    },
    "application/set-registration-initiation": {
      source: "iana",
      extensions: ["setreg"]
    },
    "application/sgml": {
      source: "iana"
    },
    "application/sgml-open-catalog": {
      source: "iana"
    },
    "application/shf+xml": {
      source: "iana",
      compressible: true,
      extensions: ["shf"]
    },
    "application/sieve": {
      source: "iana",
      extensions: ["siv", "sieve"]
    },
    "application/simple-filter+xml": {
      source: "iana",
      compressible: true
    },
    "application/simple-message-summary": {
      source: "iana"
    },
    "application/simplesymbolcontainer": {
      source: "iana"
    },
    "application/sipc": {
      source: "iana"
    },
    "application/slate": {
      source: "iana"
    },
    "application/smil": {
      source: "iana"
    },
    "application/smil+xml": {
      source: "iana",
      compressible: true,
      extensions: ["smi", "smil"]
    },
    "application/smpte336m": {
      source: "iana"
    },
    "application/soap+fastinfoset": {
      source: "iana"
    },
    "application/soap+xml": {
      source: "iana",
      compressible: true
    },
    "application/sparql-query": {
      source: "iana",
      extensions: ["rq"]
    },
    "application/sparql-results+xml": {
      source: "iana",
      compressible: true,
      extensions: ["srx"]
    },
    "application/spdx+json": {
      source: "iana",
      compressible: true
    },
    "application/spirits-event+xml": {
      source: "iana",
      compressible: true
    },
    "application/sql": {
      source: "iana"
    },
    "application/srgs": {
      source: "iana",
      extensions: ["gram"]
    },
    "application/srgs+xml": {
      source: "iana",
      compressible: true,
      extensions: ["grxml"]
    },
    "application/sru+xml": {
      source: "iana",
      compressible: true,
      extensions: ["sru"]
    },
    "application/ssdl+xml": {
      source: "apache",
      compressible: true,
      extensions: ["ssdl"]
    },
    "application/ssml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["ssml"]
    },
    "application/stix+json": {
      source: "iana",
      compressible: true
    },
    "application/swid+xml": {
      source: "iana",
      compressible: true,
      extensions: ["swidtag"]
    },
    "application/tamp-apex-update": {
      source: "iana"
    },
    "application/tamp-apex-update-confirm": {
      source: "iana"
    },
    "application/tamp-community-update": {
      source: "iana"
    },
    "application/tamp-community-update-confirm": {
      source: "iana"
    },
    "application/tamp-error": {
      source: "iana"
    },
    "application/tamp-sequence-adjust": {
      source: "iana"
    },
    "application/tamp-sequence-adjust-confirm": {
      source: "iana"
    },
    "application/tamp-status-query": {
      source: "iana"
    },
    "application/tamp-status-response": {
      source: "iana"
    },
    "application/tamp-update": {
      source: "iana"
    },
    "application/tamp-update-confirm": {
      source: "iana"
    },
    "application/tar": {
      compressible: true
    },
    "application/taxii+json": {
      source: "iana",
      compressible: true
    },
    "application/td+json": {
      source: "iana",
      compressible: true
    },
    "application/tei+xml": {
      source: "iana",
      compressible: true,
      extensions: ["tei", "teicorpus"]
    },
    "application/tetra_isi": {
      source: "iana"
    },
    "application/thraud+xml": {
      source: "iana",
      compressible: true,
      extensions: ["tfi"]
    },
    "application/timestamp-query": {
      source: "iana"
    },
    "application/timestamp-reply": {
      source: "iana"
    },
    "application/timestamped-data": {
      source: "iana",
      extensions: ["tsd"]
    },
    "application/tlsrpt+gzip": {
      source: "iana"
    },
    "application/tlsrpt+json": {
      source: "iana",
      compressible: true
    },
    "application/tnauthlist": {
      source: "iana"
    },
    "application/token-introspection+jwt": {
      source: "iana"
    },
    "application/toml": {
      compressible: true,
      extensions: ["toml"]
    },
    "application/trickle-ice-sdpfrag": {
      source: "iana"
    },
    "application/trig": {
      source: "iana",
      extensions: ["trig"]
    },
    "application/ttml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["ttml"]
    },
    "application/tve-trigger": {
      source: "iana"
    },
    "application/tzif": {
      source: "iana"
    },
    "application/tzif-leap": {
      source: "iana"
    },
    "application/ubjson": {
      compressible: false,
      extensions: ["ubj"]
    },
    "application/ulpfec": {
      source: "iana"
    },
    "application/urc-grpsheet+xml": {
      source: "iana",
      compressible: true
    },
    "application/urc-ressheet+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rsheet"]
    },
    "application/urc-targetdesc+xml": {
      source: "iana",
      compressible: true,
      extensions: ["td"]
    },
    "application/urc-uisocketdesc+xml": {
      source: "iana",
      compressible: true
    },
    "application/vcard+json": {
      source: "iana",
      compressible: true
    },
    "application/vcard+xml": {
      source: "iana",
      compressible: true
    },
    "application/vemmi": {
      source: "iana"
    },
    "application/vividence.scriptfile": {
      source: "apache"
    },
    "application/vnd.1000minds.decision-model+xml": {
      source: "iana",
      compressible: true,
      extensions: ["1km"]
    },
    "application/vnd.3gpp-prose+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp-prose-pc3ch+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp-v2x-local-service-information": {
      source: "iana"
    },
    "application/vnd.3gpp.5gnas": {
      source: "iana"
    },
    "application/vnd.3gpp.access-transfer-events+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.bsf+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.gmop+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.gtpc": {
      source: "iana"
    },
    "application/vnd.3gpp.interworking-data": {
      source: "iana"
    },
    "application/vnd.3gpp.lpp": {
      source: "iana"
    },
    "application/vnd.3gpp.mc-signalling-ear": {
      source: "iana"
    },
    "application/vnd.3gpp.mcdata-affiliation-command+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcdata-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcdata-payload": {
      source: "iana"
    },
    "application/vnd.3gpp.mcdata-service-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcdata-signalling": {
      source: "iana"
    },
    "application/vnd.3gpp.mcdata-ue-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcdata-user-profile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-affiliation-command+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-floor-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-location-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-service-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-signed+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-ue-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-ue-init-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-user-profile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-location-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-service-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-transmission-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-ue-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-user-profile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mid-call+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.ngap": {
      source: "iana"
    },
    "application/vnd.3gpp.pfcp": {
      source: "iana"
    },
    "application/vnd.3gpp.pic-bw-large": {
      source: "iana",
      extensions: ["plb"]
    },
    "application/vnd.3gpp.pic-bw-small": {
      source: "iana",
      extensions: ["psb"]
    },
    "application/vnd.3gpp.pic-bw-var": {
      source: "iana",
      extensions: ["pvb"]
    },
    "application/vnd.3gpp.s1ap": {
      source: "iana"
    },
    "application/vnd.3gpp.sms": {
      source: "iana"
    },
    "application/vnd.3gpp.sms+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.srvcc-ext+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.srvcc-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.state-and-event-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.ussd+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp2.bcmcsinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp2.sms": {
      source: "iana"
    },
    "application/vnd.3gpp2.tcap": {
      source: "iana",
      extensions: ["tcap"]
    },
    "application/vnd.3lightssoftware.imagescal": {
      source: "iana"
    },
    "application/vnd.3m.post-it-notes": {
      source: "iana",
      extensions: ["pwn"]
    },
    "application/vnd.accpac.simply.aso": {
      source: "iana",
      extensions: ["aso"]
    },
    "application/vnd.accpac.simply.imp": {
      source: "iana",
      extensions: ["imp"]
    },
    "application/vnd.acucobol": {
      source: "iana",
      extensions: ["acu"]
    },
    "application/vnd.acucorp": {
      source: "iana",
      extensions: ["atc", "acutc"]
    },
    "application/vnd.adobe.air-application-installer-package+zip": {
      source: "apache",
      compressible: false,
      extensions: ["air"]
    },
    "application/vnd.adobe.flash.movie": {
      source: "iana"
    },
    "application/vnd.adobe.formscentral.fcdt": {
      source: "iana",
      extensions: ["fcdt"]
    },
    "application/vnd.adobe.fxp": {
      source: "iana",
      extensions: ["fxp", "fxpl"]
    },
    "application/vnd.adobe.partial-upload": {
      source: "iana"
    },
    "application/vnd.adobe.xdp+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xdp"]
    },
    "application/vnd.adobe.xfdf": {
      source: "iana",
      extensions: ["xfdf"]
    },
    "application/vnd.aether.imp": {
      source: "iana"
    },
    "application/vnd.afpc.afplinedata": {
      source: "iana"
    },
    "application/vnd.afpc.afplinedata-pagedef": {
      source: "iana"
    },
    "application/vnd.afpc.cmoca-cmresource": {
      source: "iana"
    },
    "application/vnd.afpc.foca-charset": {
      source: "iana"
    },
    "application/vnd.afpc.foca-codedfont": {
      source: "iana"
    },
    "application/vnd.afpc.foca-codepage": {
      source: "iana"
    },
    "application/vnd.afpc.modca": {
      source: "iana"
    },
    "application/vnd.afpc.modca-cmtable": {
      source: "iana"
    },
    "application/vnd.afpc.modca-formdef": {
      source: "iana"
    },
    "application/vnd.afpc.modca-mediummap": {
      source: "iana"
    },
    "application/vnd.afpc.modca-objectcontainer": {
      source: "iana"
    },
    "application/vnd.afpc.modca-overlay": {
      source: "iana"
    },
    "application/vnd.afpc.modca-pagesegment": {
      source: "iana"
    },
    "application/vnd.age": {
      source: "iana",
      extensions: ["age"]
    },
    "application/vnd.ah-barcode": {
      source: "iana"
    },
    "application/vnd.ahead.space": {
      source: "iana",
      extensions: ["ahead"]
    },
    "application/vnd.airzip.filesecure.azf": {
      source: "iana",
      extensions: ["azf"]
    },
    "application/vnd.airzip.filesecure.azs": {
      source: "iana",
      extensions: ["azs"]
    },
    "application/vnd.amadeus+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.amazon.ebook": {
      source: "apache",
      extensions: ["azw"]
    },
    "application/vnd.amazon.mobi8-ebook": {
      source: "iana"
    },
    "application/vnd.americandynamics.acc": {
      source: "iana",
      extensions: ["acc"]
    },
    "application/vnd.amiga.ami": {
      source: "iana",
      extensions: ["ami"]
    },
    "application/vnd.amundsen.maze+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.android.ota": {
      source: "iana"
    },
    "application/vnd.android.package-archive": {
      source: "apache",
      compressible: false,
      extensions: ["apk"]
    },
    "application/vnd.anki": {
      source: "iana"
    },
    "application/vnd.anser-web-certificate-issue-initiation": {
      source: "iana",
      extensions: ["cii"]
    },
    "application/vnd.anser-web-funds-transfer-initiation": {
      source: "apache",
      extensions: ["fti"]
    },
    "application/vnd.antix.game-component": {
      source: "iana",
      extensions: ["atx"]
    },
    "application/vnd.apache.arrow.file": {
      source: "iana"
    },
    "application/vnd.apache.arrow.stream": {
      source: "iana"
    },
    "application/vnd.apache.thrift.binary": {
      source: "iana"
    },
    "application/vnd.apache.thrift.compact": {
      source: "iana"
    },
    "application/vnd.apache.thrift.json": {
      source: "iana"
    },
    "application/vnd.api+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.aplextor.warrp+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.apothekende.reservation+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.apple.installer+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mpkg"]
    },
    "application/vnd.apple.keynote": {
      source: "iana",
      extensions: ["key"]
    },
    "application/vnd.apple.mpegurl": {
      source: "iana",
      extensions: ["m3u8"]
    },
    "application/vnd.apple.numbers": {
      source: "iana",
      extensions: ["numbers"]
    },
    "application/vnd.apple.pages": {
      source: "iana",
      extensions: ["pages"]
    },
    "application/vnd.apple.pkpass": {
      compressible: false,
      extensions: ["pkpass"]
    },
    "application/vnd.arastra.swi": {
      source: "iana"
    },
    "application/vnd.aristanetworks.swi": {
      source: "iana",
      extensions: ["swi"]
    },
    "application/vnd.artisan+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.artsquare": {
      source: "iana"
    },
    "application/vnd.astraea-software.iota": {
      source: "iana",
      extensions: ["iota"]
    },
    "application/vnd.audiograph": {
      source: "iana",
      extensions: ["aep"]
    },
    "application/vnd.autopackage": {
      source: "iana"
    },
    "application/vnd.avalon+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.avistar+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.balsamiq.bmml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["bmml"]
    },
    "application/vnd.balsamiq.bmpr": {
      source: "iana"
    },
    "application/vnd.banana-accounting": {
      source: "iana"
    },
    "application/vnd.bbf.usp.error": {
      source: "iana"
    },
    "application/vnd.bbf.usp.msg": {
      source: "iana"
    },
    "application/vnd.bbf.usp.msg+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.bekitzur-stech+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.bint.med-content": {
      source: "iana"
    },
    "application/vnd.biopax.rdf+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.blink-idb-value-wrapper": {
      source: "iana"
    },
    "application/vnd.blueice.multipass": {
      source: "iana",
      extensions: ["mpm"]
    },
    "application/vnd.bluetooth.ep.oob": {
      source: "iana"
    },
    "application/vnd.bluetooth.le.oob": {
      source: "iana"
    },
    "application/vnd.bmi": {
      source: "iana",
      extensions: ["bmi"]
    },
    "application/vnd.bpf": {
      source: "iana"
    },
    "application/vnd.bpf3": {
      source: "iana"
    },
    "application/vnd.businessobjects": {
      source: "iana",
      extensions: ["rep"]
    },
    "application/vnd.byu.uapi+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cab-jscript": {
      source: "iana"
    },
    "application/vnd.canon-cpdl": {
      source: "iana"
    },
    "application/vnd.canon-lips": {
      source: "iana"
    },
    "application/vnd.capasystems-pg+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cendio.thinlinc.clientconf": {
      source: "iana"
    },
    "application/vnd.century-systems.tcp_stream": {
      source: "iana"
    },
    "application/vnd.chemdraw+xml": {
      source: "iana",
      compressible: true,
      extensions: ["cdxml"]
    },
    "application/vnd.chess-pgn": {
      source: "iana"
    },
    "application/vnd.chipnuts.karaoke-mmd": {
      source: "iana",
      extensions: ["mmd"]
    },
    "application/vnd.ciedi": {
      source: "iana"
    },
    "application/vnd.cinderella": {
      source: "iana",
      extensions: ["cdy"]
    },
    "application/vnd.cirpack.isdn-ext": {
      source: "iana"
    },
    "application/vnd.citationstyles.style+xml": {
      source: "iana",
      compressible: true,
      extensions: ["csl"]
    },
    "application/vnd.claymore": {
      source: "iana",
      extensions: ["cla"]
    },
    "application/vnd.cloanto.rp9": {
      source: "iana",
      extensions: ["rp9"]
    },
    "application/vnd.clonk.c4group": {
      source: "iana",
      extensions: ["c4g", "c4d", "c4f", "c4p", "c4u"]
    },
    "application/vnd.cluetrust.cartomobile-config": {
      source: "iana",
      extensions: ["c11amc"]
    },
    "application/vnd.cluetrust.cartomobile-config-pkg": {
      source: "iana",
      extensions: ["c11amz"]
    },
    "application/vnd.coffeescript": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.document": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.document-template": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.presentation": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.presentation-template": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.spreadsheet": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.spreadsheet-template": {
      source: "iana"
    },
    "application/vnd.collection+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.collection.doc+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.collection.next+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.comicbook+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.comicbook-rar": {
      source: "iana"
    },
    "application/vnd.commerce-battelle": {
      source: "iana"
    },
    "application/vnd.commonspace": {
      source: "iana",
      extensions: ["csp"]
    },
    "application/vnd.contact.cmsg": {
      source: "iana",
      extensions: ["cdbcmsg"]
    },
    "application/vnd.coreos.ignition+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cosmocaller": {
      source: "iana",
      extensions: ["cmc"]
    },
    "application/vnd.crick.clicker": {
      source: "iana",
      extensions: ["clkx"]
    },
    "application/vnd.crick.clicker.keyboard": {
      source: "iana",
      extensions: ["clkk"]
    },
    "application/vnd.crick.clicker.palette": {
      source: "iana",
      extensions: ["clkp"]
    },
    "application/vnd.crick.clicker.template": {
      source: "iana",
      extensions: ["clkt"]
    },
    "application/vnd.crick.clicker.wordbank": {
      source: "iana",
      extensions: ["clkw"]
    },
    "application/vnd.criticaltools.wbs+xml": {
      source: "iana",
      compressible: true,
      extensions: ["wbs"]
    },
    "application/vnd.cryptii.pipe+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.crypto-shade-file": {
      source: "iana"
    },
    "application/vnd.cryptomator.encrypted": {
      source: "iana"
    },
    "application/vnd.cryptomator.vault": {
      source: "iana"
    },
    "application/vnd.ctc-posml": {
      source: "iana",
      extensions: ["pml"]
    },
    "application/vnd.ctct.ws+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cups-pdf": {
      source: "iana"
    },
    "application/vnd.cups-postscript": {
      source: "iana"
    },
    "application/vnd.cups-ppd": {
      source: "iana",
      extensions: ["ppd"]
    },
    "application/vnd.cups-raster": {
      source: "iana"
    },
    "application/vnd.cups-raw": {
      source: "iana"
    },
    "application/vnd.curl": {
      source: "iana"
    },
    "application/vnd.curl.car": {
      source: "apache",
      extensions: ["car"]
    },
    "application/vnd.curl.pcurl": {
      source: "apache",
      extensions: ["pcurl"]
    },
    "application/vnd.cyan.dean.root+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cybank": {
      source: "iana"
    },
    "application/vnd.cyclonedx+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cyclonedx+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.d2l.coursepackage1p0+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.d3m-dataset": {
      source: "iana"
    },
    "application/vnd.d3m-problem": {
      source: "iana"
    },
    "application/vnd.dart": {
      source: "iana",
      compressible: true,
      extensions: ["dart"]
    },
    "application/vnd.data-vision.rdz": {
      source: "iana",
      extensions: ["rdz"]
    },
    "application/vnd.datapackage+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dataresource+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dbf": {
      source: "iana",
      extensions: ["dbf"]
    },
    "application/vnd.debian.binary-package": {
      source: "iana"
    },
    "application/vnd.dece.data": {
      source: "iana",
      extensions: ["uvf", "uvvf", "uvd", "uvvd"]
    },
    "application/vnd.dece.ttml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["uvt", "uvvt"]
    },
    "application/vnd.dece.unspecified": {
      source: "iana",
      extensions: ["uvx", "uvvx"]
    },
    "application/vnd.dece.zip": {
      source: "iana",
      extensions: ["uvz", "uvvz"]
    },
    "application/vnd.denovo.fcselayout-link": {
      source: "iana",
      extensions: ["fe_launch"]
    },
    "application/vnd.desmume.movie": {
      source: "iana"
    },
    "application/vnd.dir-bi.plate-dl-nosuffix": {
      source: "iana"
    },
    "application/vnd.dm.delegation+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dna": {
      source: "iana",
      extensions: ["dna"]
    },
    "application/vnd.document+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dolby.mlp": {
      source: "apache",
      extensions: ["mlp"]
    },
    "application/vnd.dolby.mobile.1": {
      source: "iana"
    },
    "application/vnd.dolby.mobile.2": {
      source: "iana"
    },
    "application/vnd.doremir.scorecloud-binary-document": {
      source: "iana"
    },
    "application/vnd.dpgraph": {
      source: "iana",
      extensions: ["dpg"]
    },
    "application/vnd.dreamfactory": {
      source: "iana",
      extensions: ["dfac"]
    },
    "application/vnd.drive+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ds-keypoint": {
      source: "apache",
      extensions: ["kpxx"]
    },
    "application/vnd.dtg.local": {
      source: "iana"
    },
    "application/vnd.dtg.local.flash": {
      source: "iana"
    },
    "application/vnd.dtg.local.html": {
      source: "iana"
    },
    "application/vnd.dvb.ait": {
      source: "iana",
      extensions: ["ait"]
    },
    "application/vnd.dvb.dvbisl+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.dvbj": {
      source: "iana"
    },
    "application/vnd.dvb.esgcontainer": {
      source: "iana"
    },
    "application/vnd.dvb.ipdcdftnotifaccess": {
      source: "iana"
    },
    "application/vnd.dvb.ipdcesgaccess": {
      source: "iana"
    },
    "application/vnd.dvb.ipdcesgaccess2": {
      source: "iana"
    },
    "application/vnd.dvb.ipdcesgpdd": {
      source: "iana"
    },
    "application/vnd.dvb.ipdcroaming": {
      source: "iana"
    },
    "application/vnd.dvb.iptv.alfec-base": {
      source: "iana"
    },
    "application/vnd.dvb.iptv.alfec-enhancement": {
      source: "iana"
    },
    "application/vnd.dvb.notif-aggregate-root+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-container+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-generic+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-ia-msglist+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-ia-registration-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-ia-registration-response+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-init+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.pfr": {
      source: "iana"
    },
    "application/vnd.dvb.service": {
      source: "iana",
      extensions: ["svc"]
    },
    "application/vnd.dxr": {
      source: "iana"
    },
    "application/vnd.dynageo": {
      source: "iana",
      extensions: ["geo"]
    },
    "application/vnd.dzr": {
      source: "iana"
    },
    "application/vnd.easykaraoke.cdgdownload": {
      source: "iana"
    },
    "application/vnd.ecdis-update": {
      source: "iana"
    },
    "application/vnd.ecip.rlp": {
      source: "iana"
    },
    "application/vnd.eclipse.ditto+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ecowin.chart": {
      source: "iana",
      extensions: ["mag"]
    },
    "application/vnd.ecowin.filerequest": {
      source: "iana"
    },
    "application/vnd.ecowin.fileupdate": {
      source: "iana"
    },
    "application/vnd.ecowin.series": {
      source: "iana"
    },
    "application/vnd.ecowin.seriesrequest": {
      source: "iana"
    },
    "application/vnd.ecowin.seriesupdate": {
      source: "iana"
    },
    "application/vnd.efi.img": {
      source: "iana"
    },
    "application/vnd.efi.iso": {
      source: "iana"
    },
    "application/vnd.emclient.accessrequest+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.enliven": {
      source: "iana",
      extensions: ["nml"]
    },
    "application/vnd.enphase.envoy": {
      source: "iana"
    },
    "application/vnd.eprints.data+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.epson.esf": {
      source: "iana",
      extensions: ["esf"]
    },
    "application/vnd.epson.msf": {
      source: "iana",
      extensions: ["msf"]
    },
    "application/vnd.epson.quickanime": {
      source: "iana",
      extensions: ["qam"]
    },
    "application/vnd.epson.salt": {
      source: "iana",
      extensions: ["slt"]
    },
    "application/vnd.epson.ssf": {
      source: "iana",
      extensions: ["ssf"]
    },
    "application/vnd.ericsson.quickcall": {
      source: "iana"
    },
    "application/vnd.espass-espass+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.eszigno3+xml": {
      source: "iana",
      compressible: true,
      extensions: ["es3", "et3"]
    },
    "application/vnd.etsi.aoc+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.asic-e+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.etsi.asic-s+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.etsi.cug+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvcommand+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvdiscovery+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvprofile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvsad-bc+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvsad-cod+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvsad-npvr+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvservice+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvsync+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvueprofile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.mcid+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.mheg5": {
      source: "iana"
    },
    "application/vnd.etsi.overload-control-policy-dataset+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.pstn+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.sci+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.simservs+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.timestamp-token": {
      source: "iana"
    },
    "application/vnd.etsi.tsl+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.tsl.der": {
      source: "iana"
    },
    "application/vnd.eu.kasparian.car+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.eudora.data": {
      source: "iana"
    },
    "application/vnd.evolv.ecig.profile": {
      source: "iana"
    },
    "application/vnd.evolv.ecig.settings": {
      source: "iana"
    },
    "application/vnd.evolv.ecig.theme": {
      source: "iana"
    },
    "application/vnd.exstream-empower+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.exstream-package": {
      source: "iana"
    },
    "application/vnd.ezpix-album": {
      source: "iana",
      extensions: ["ez2"]
    },
    "application/vnd.ezpix-package": {
      source: "iana",
      extensions: ["ez3"]
    },
    "application/vnd.f-secure.mobile": {
      source: "iana"
    },
    "application/vnd.familysearch.gedcom+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.fastcopy-disk-image": {
      source: "iana"
    },
    "application/vnd.fdf": {
      source: "iana",
      extensions: ["fdf"]
    },
    "application/vnd.fdsn.mseed": {
      source: "iana",
      extensions: ["mseed"]
    },
    "application/vnd.fdsn.seed": {
      source: "iana",
      extensions: ["seed", "dataless"]
    },
    "application/vnd.ffsns": {
      source: "iana"
    },
    "application/vnd.ficlab.flb+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.filmit.zfc": {
      source: "iana"
    },
    "application/vnd.fints": {
      source: "iana"
    },
    "application/vnd.firemonkeys.cloudcell": {
      source: "iana"
    },
    "application/vnd.flographit": {
      source: "iana",
      extensions: ["gph"]
    },
    "application/vnd.fluxtime.clip": {
      source: "iana",
      extensions: ["ftc"]
    },
    "application/vnd.font-fontforge-sfd": {
      source: "iana"
    },
    "application/vnd.framemaker": {
      source: "iana",
      extensions: ["fm", "frame", "maker", "book"]
    },
    "application/vnd.frogans.fnc": {
      source: "iana",
      extensions: ["fnc"]
    },
    "application/vnd.frogans.ltf": {
      source: "iana",
      extensions: ["ltf"]
    },
    "application/vnd.fsc.weblaunch": {
      source: "iana",
      extensions: ["fsc"]
    },
    "application/vnd.fujifilm.fb.docuworks": {
      source: "iana"
    },
    "application/vnd.fujifilm.fb.docuworks.binder": {
      source: "iana"
    },
    "application/vnd.fujifilm.fb.docuworks.container": {
      source: "iana"
    },
    "application/vnd.fujifilm.fb.jfi+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.fujitsu.oasys": {
      source: "iana",
      extensions: ["oas"]
    },
    "application/vnd.fujitsu.oasys2": {
      source: "iana",
      extensions: ["oa2"]
    },
    "application/vnd.fujitsu.oasys3": {
      source: "iana",
      extensions: ["oa3"]
    },
    "application/vnd.fujitsu.oasysgp": {
      source: "iana",
      extensions: ["fg5"]
    },
    "application/vnd.fujitsu.oasysprs": {
      source: "iana",
      extensions: ["bh2"]
    },
    "application/vnd.fujixerox.art-ex": {
      source: "iana"
    },
    "application/vnd.fujixerox.art4": {
      source: "iana"
    },
    "application/vnd.fujixerox.ddd": {
      source: "iana",
      extensions: ["ddd"]
    },
    "application/vnd.fujixerox.docuworks": {
      source: "iana",
      extensions: ["xdw"]
    },
    "application/vnd.fujixerox.docuworks.binder": {
      source: "iana",
      extensions: ["xbd"]
    },
    "application/vnd.fujixerox.docuworks.container": {
      source: "iana"
    },
    "application/vnd.fujixerox.hbpl": {
      source: "iana"
    },
    "application/vnd.fut-misnet": {
      source: "iana"
    },
    "application/vnd.futoin+cbor": {
      source: "iana"
    },
    "application/vnd.futoin+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.fuzzysheet": {
      source: "iana",
      extensions: ["fzs"]
    },
    "application/vnd.genomatix.tuxedo": {
      source: "iana",
      extensions: ["txd"]
    },
    "application/vnd.gentics.grd+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.geo+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.geocube+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.geogebra.file": {
      source: "iana",
      extensions: ["ggb"]
    },
    "application/vnd.geogebra.slides": {
      source: "iana"
    },
    "application/vnd.geogebra.tool": {
      source: "iana",
      extensions: ["ggt"]
    },
    "application/vnd.geometry-explorer": {
      source: "iana",
      extensions: ["gex", "gre"]
    },
    "application/vnd.geonext": {
      source: "iana",
      extensions: ["gxt"]
    },
    "application/vnd.geoplan": {
      source: "iana",
      extensions: ["g2w"]
    },
    "application/vnd.geospace": {
      source: "iana",
      extensions: ["g3w"]
    },
    "application/vnd.gerber": {
      source: "iana"
    },
    "application/vnd.globalplatform.card-content-mgt": {
      source: "iana"
    },
    "application/vnd.globalplatform.card-content-mgt-response": {
      source: "iana"
    },
    "application/vnd.gmx": {
      source: "iana",
      extensions: ["gmx"]
    },
    "application/vnd.google-apps.document": {
      compressible: false,
      extensions: ["gdoc"]
    },
    "application/vnd.google-apps.presentation": {
      compressible: false,
      extensions: ["gslides"]
    },
    "application/vnd.google-apps.spreadsheet": {
      compressible: false,
      extensions: ["gsheet"]
    },
    "application/vnd.google-earth.kml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["kml"]
    },
    "application/vnd.google-earth.kmz": {
      source: "iana",
      compressible: false,
      extensions: ["kmz"]
    },
    "application/vnd.gov.sk.e-form+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.gov.sk.e-form+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.gov.sk.xmldatacontainer+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.grafeq": {
      source: "iana",
      extensions: ["gqf", "gqs"]
    },
    "application/vnd.gridmp": {
      source: "iana"
    },
    "application/vnd.groove-account": {
      source: "iana",
      extensions: ["gac"]
    },
    "application/vnd.groove-help": {
      source: "iana",
      extensions: ["ghf"]
    },
    "application/vnd.groove-identity-message": {
      source: "iana",
      extensions: ["gim"]
    },
    "application/vnd.groove-injector": {
      source: "iana",
      extensions: ["grv"]
    },
    "application/vnd.groove-tool-message": {
      source: "iana",
      extensions: ["gtm"]
    },
    "application/vnd.groove-tool-template": {
      source: "iana",
      extensions: ["tpl"]
    },
    "application/vnd.groove-vcard": {
      source: "iana",
      extensions: ["vcg"]
    },
    "application/vnd.hal+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hal+xml": {
      source: "iana",
      compressible: true,
      extensions: ["hal"]
    },
    "application/vnd.handheld-entertainment+xml": {
      source: "iana",
      compressible: true,
      extensions: ["zmm"]
    },
    "application/vnd.hbci": {
      source: "iana",
      extensions: ["hbci"]
    },
    "application/vnd.hc+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hcl-bireports": {
      source: "iana"
    },
    "application/vnd.hdt": {
      source: "iana"
    },
    "application/vnd.heroku+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hhe.lesson-player": {
      source: "iana",
      extensions: ["les"]
    },
    "application/vnd.hl7cda+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.hl7v2+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.hp-hpgl": {
      source: "iana",
      extensions: ["hpgl"]
    },
    "application/vnd.hp-hpid": {
      source: "iana",
      extensions: ["hpid"]
    },
    "application/vnd.hp-hps": {
      source: "iana",
      extensions: ["hps"]
    },
    "application/vnd.hp-jlyt": {
      source: "iana",
      extensions: ["jlt"]
    },
    "application/vnd.hp-pcl": {
      source: "iana",
      extensions: ["pcl"]
    },
    "application/vnd.hp-pclxl": {
      source: "iana",
      extensions: ["pclxl"]
    },
    "application/vnd.httphone": {
      source: "iana"
    },
    "application/vnd.hydrostatix.sof-data": {
      source: "iana",
      extensions: ["sfd-hdstx"]
    },
    "application/vnd.hyper+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hyper-item+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hyperdrive+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hzn-3d-crossword": {
      source: "iana"
    },
    "application/vnd.ibm.afplinedata": {
      source: "iana"
    },
    "application/vnd.ibm.electronic-media": {
      source: "iana"
    },
    "application/vnd.ibm.minipay": {
      source: "iana",
      extensions: ["mpy"]
    },
    "application/vnd.ibm.modcap": {
      source: "iana",
      extensions: ["afp", "listafp", "list3820"]
    },
    "application/vnd.ibm.rights-management": {
      source: "iana",
      extensions: ["irm"]
    },
    "application/vnd.ibm.secure-container": {
      source: "iana",
      extensions: ["sc"]
    },
    "application/vnd.iccprofile": {
      source: "iana",
      extensions: ["icc", "icm"]
    },
    "application/vnd.ieee.1905": {
      source: "iana"
    },
    "application/vnd.igloader": {
      source: "iana",
      extensions: ["igl"]
    },
    "application/vnd.imagemeter.folder+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.imagemeter.image+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.immervision-ivp": {
      source: "iana",
      extensions: ["ivp"]
    },
    "application/vnd.immervision-ivu": {
      source: "iana",
      extensions: ["ivu"]
    },
    "application/vnd.ims.imsccv1p1": {
      source: "iana"
    },
    "application/vnd.ims.imsccv1p2": {
      source: "iana"
    },
    "application/vnd.ims.imsccv1p3": {
      source: "iana"
    },
    "application/vnd.ims.lis.v2.result+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ims.lti.v2.toolproxy+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ims.lti.v2.toolproxy.id+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ims.lti.v2.toolsettings+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ims.lti.v2.toolsettings.simple+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.informedcontrol.rms+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.informix-visionary": {
      source: "iana"
    },
    "application/vnd.infotech.project": {
      source: "iana"
    },
    "application/vnd.infotech.project+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.innopath.wamp.notification": {
      source: "iana"
    },
    "application/vnd.insors.igm": {
      source: "iana",
      extensions: ["igm"]
    },
    "application/vnd.intercon.formnet": {
      source: "iana",
      extensions: ["xpw", "xpx"]
    },
    "application/vnd.intergeo": {
      source: "iana",
      extensions: ["i2g"]
    },
    "application/vnd.intertrust.digibox": {
      source: "iana"
    },
    "application/vnd.intertrust.nncp": {
      source: "iana"
    },
    "application/vnd.intu.qbo": {
      source: "iana",
      extensions: ["qbo"]
    },
    "application/vnd.intu.qfx": {
      source: "iana",
      extensions: ["qfx"]
    },
    "application/vnd.iptc.g2.catalogitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.conceptitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.knowledgeitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.newsitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.newsmessage+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.packageitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.planningitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ipunplugged.rcprofile": {
      source: "iana",
      extensions: ["rcprofile"]
    },
    "application/vnd.irepository.package+xml": {
      source: "iana",
      compressible: true,
      extensions: ["irp"]
    },
    "application/vnd.is-xpr": {
      source: "iana",
      extensions: ["xpr"]
    },
    "application/vnd.isac.fcs": {
      source: "iana",
      extensions: ["fcs"]
    },
    "application/vnd.iso11783-10+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.jam": {
      source: "iana",
      extensions: ["jam"]
    },
    "application/vnd.japannet-directory-service": {
      source: "iana"
    },
    "application/vnd.japannet-jpnstore-wakeup": {
      source: "iana"
    },
    "application/vnd.japannet-payment-wakeup": {
      source: "iana"
    },
    "application/vnd.japannet-registration": {
      source: "iana"
    },
    "application/vnd.japannet-registration-wakeup": {
      source: "iana"
    },
    "application/vnd.japannet-setstore-wakeup": {
      source: "iana"
    },
    "application/vnd.japannet-verification": {
      source: "iana"
    },
    "application/vnd.japannet-verification-wakeup": {
      source: "iana"
    },
    "application/vnd.jcp.javame.midlet-rms": {
      source: "iana",
      extensions: ["rms"]
    },
    "application/vnd.jisp": {
      source: "iana",
      extensions: ["jisp"]
    },
    "application/vnd.joost.joda-archive": {
      source: "iana",
      extensions: ["joda"]
    },
    "application/vnd.jsk.isdn-ngn": {
      source: "iana"
    },
    "application/vnd.kahootz": {
      source: "iana",
      extensions: ["ktz", "ktr"]
    },
    "application/vnd.kde.karbon": {
      source: "iana",
      extensions: ["karbon"]
    },
    "application/vnd.kde.kchart": {
      source: "iana",
      extensions: ["chrt"]
    },
    "application/vnd.kde.kformula": {
      source: "iana",
      extensions: ["kfo"]
    },
    "application/vnd.kde.kivio": {
      source: "iana",
      extensions: ["flw"]
    },
    "application/vnd.kde.kontour": {
      source: "iana",
      extensions: ["kon"]
    },
    "application/vnd.kde.kpresenter": {
      source: "iana",
      extensions: ["kpr", "kpt"]
    },
    "application/vnd.kde.kspread": {
      source: "iana",
      extensions: ["ksp"]
    },
    "application/vnd.kde.kword": {
      source: "iana",
      extensions: ["kwd", "kwt"]
    },
    "application/vnd.kenameaapp": {
      source: "iana",
      extensions: ["htke"]
    },
    "application/vnd.kidspiration": {
      source: "iana",
      extensions: ["kia"]
    },
    "application/vnd.kinar": {
      source: "iana",
      extensions: ["kne", "knp"]
    },
    "application/vnd.koan": {
      source: "iana",
      extensions: ["skp", "skd", "skt", "skm"]
    },
    "application/vnd.kodak-descriptor": {
      source: "iana",
      extensions: ["sse"]
    },
    "application/vnd.las": {
      source: "iana"
    },
    "application/vnd.las.las+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.las.las+xml": {
      source: "iana",
      compressible: true,
      extensions: ["lasxml"]
    },
    "application/vnd.laszip": {
      source: "iana"
    },
    "application/vnd.leap+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.liberty-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.llamagraphics.life-balance.desktop": {
      source: "iana",
      extensions: ["lbd"]
    },
    "application/vnd.llamagraphics.life-balance.exchange+xml": {
      source: "iana",
      compressible: true,
      extensions: ["lbe"]
    },
    "application/vnd.logipipe.circuit+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.loom": {
      source: "iana"
    },
    "application/vnd.lotus-1-2-3": {
      source: "iana",
      extensions: ["123"]
    },
    "application/vnd.lotus-approach": {
      source: "iana",
      extensions: ["apr"]
    },
    "application/vnd.lotus-freelance": {
      source: "iana",
      extensions: ["pre"]
    },
    "application/vnd.lotus-notes": {
      source: "iana",
      extensions: ["nsf"]
    },
    "application/vnd.lotus-organizer": {
      source: "iana",
      extensions: ["org"]
    },
    "application/vnd.lotus-screencam": {
      source: "iana",
      extensions: ["scm"]
    },
    "application/vnd.lotus-wordpro": {
      source: "iana",
      extensions: ["lwp"]
    },
    "application/vnd.macports.portpkg": {
      source: "iana",
      extensions: ["portpkg"]
    },
    "application/vnd.mapbox-vector-tile": {
      source: "iana",
      extensions: ["mvt"]
    },
    "application/vnd.marlin.drm.actiontoken+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.marlin.drm.conftoken+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.marlin.drm.license+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.marlin.drm.mdcf": {
      source: "iana"
    },
    "application/vnd.mason+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.maxar.archive.3tz+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.maxmind.maxmind-db": {
      source: "iana"
    },
    "application/vnd.mcd": {
      source: "iana",
      extensions: ["mcd"]
    },
    "application/vnd.medcalcdata": {
      source: "iana",
      extensions: ["mc1"]
    },
    "application/vnd.mediastation.cdkey": {
      source: "iana",
      extensions: ["cdkey"]
    },
    "application/vnd.meridian-slingshot": {
      source: "iana"
    },
    "application/vnd.mfer": {
      source: "iana",
      extensions: ["mwf"]
    },
    "application/vnd.mfmp": {
      source: "iana",
      extensions: ["mfm"]
    },
    "application/vnd.micro+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.micrografx.flo": {
      source: "iana",
      extensions: ["flo"]
    },
    "application/vnd.micrografx.igx": {
      source: "iana",
      extensions: ["igx"]
    },
    "application/vnd.microsoft.portable-executable": {
      source: "iana"
    },
    "application/vnd.microsoft.windows.thumbnail-cache": {
      source: "iana"
    },
    "application/vnd.miele+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.mif": {
      source: "iana",
      extensions: ["mif"]
    },
    "application/vnd.minisoft-hp3000-save": {
      source: "iana"
    },
    "application/vnd.mitsubishi.misty-guard.trustweb": {
      source: "iana"
    },
    "application/vnd.mobius.daf": {
      source: "iana",
      extensions: ["daf"]
    },
    "application/vnd.mobius.dis": {
      source: "iana",
      extensions: ["dis"]
    },
    "application/vnd.mobius.mbk": {
      source: "iana",
      extensions: ["mbk"]
    },
    "application/vnd.mobius.mqy": {
      source: "iana",
      extensions: ["mqy"]
    },
    "application/vnd.mobius.msl": {
      source: "iana",
      extensions: ["msl"]
    },
    "application/vnd.mobius.plc": {
      source: "iana",
      extensions: ["plc"]
    },
    "application/vnd.mobius.txf": {
      source: "iana",
      extensions: ["txf"]
    },
    "application/vnd.mophun.application": {
      source: "iana",
      extensions: ["mpn"]
    },
    "application/vnd.mophun.certificate": {
      source: "iana",
      extensions: ["mpc"]
    },
    "application/vnd.motorola.flexsuite": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.adsi": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.fis": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.gotap": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.kmr": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.ttc": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.wem": {
      source: "iana"
    },
    "application/vnd.motorola.iprm": {
      source: "iana"
    },
    "application/vnd.mozilla.xul+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xul"]
    },
    "application/vnd.ms-3mfdocument": {
      source: "iana"
    },
    "application/vnd.ms-artgalry": {
      source: "iana",
      extensions: ["cil"]
    },
    "application/vnd.ms-asf": {
      source: "iana"
    },
    "application/vnd.ms-cab-compressed": {
      source: "iana",
      extensions: ["cab"]
    },
    "application/vnd.ms-color.iccprofile": {
      source: "apache"
    },
    "application/vnd.ms-excel": {
      source: "iana",
      compressible: false,
      extensions: ["xls", "xlm", "xla", "xlc", "xlt", "xlw"]
    },
    "application/vnd.ms-excel.addin.macroenabled.12": {
      source: "iana",
      extensions: ["xlam"]
    },
    "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
      source: "iana",
      extensions: ["xlsb"]
    },
    "application/vnd.ms-excel.sheet.macroenabled.12": {
      source: "iana",
      extensions: ["xlsm"]
    },
    "application/vnd.ms-excel.template.macroenabled.12": {
      source: "iana",
      extensions: ["xltm"]
    },
    "application/vnd.ms-fontobject": {
      source: "iana",
      compressible: true,
      extensions: ["eot"]
    },
    "application/vnd.ms-htmlhelp": {
      source: "iana",
      extensions: ["chm"]
    },
    "application/vnd.ms-ims": {
      source: "iana",
      extensions: ["ims"]
    },
    "application/vnd.ms-lrm": {
      source: "iana",
      extensions: ["lrm"]
    },
    "application/vnd.ms-office.activex+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ms-officetheme": {
      source: "iana",
      extensions: ["thmx"]
    },
    "application/vnd.ms-opentype": {
      source: "apache",
      compressible: true
    },
    "application/vnd.ms-outlook": {
      compressible: false,
      extensions: ["msg"]
    },
    "application/vnd.ms-package.obfuscated-opentype": {
      source: "apache"
    },
    "application/vnd.ms-pki.seccat": {
      source: "apache",
      extensions: ["cat"]
    },
    "application/vnd.ms-pki.stl": {
      source: "apache",
      extensions: ["stl"]
    },
    "application/vnd.ms-playready.initiator+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ms-powerpoint": {
      source: "iana",
      compressible: false,
      extensions: ["ppt", "pps", "pot"]
    },
    "application/vnd.ms-powerpoint.addin.macroenabled.12": {
      source: "iana",
      extensions: ["ppam"]
    },
    "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
      source: "iana",
      extensions: ["pptm"]
    },
    "application/vnd.ms-powerpoint.slide.macroenabled.12": {
      source: "iana",
      extensions: ["sldm"]
    },
    "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
      source: "iana",
      extensions: ["ppsm"]
    },
    "application/vnd.ms-powerpoint.template.macroenabled.12": {
      source: "iana",
      extensions: ["potm"]
    },
    "application/vnd.ms-printdevicecapabilities+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ms-printing.printticket+xml": {
      source: "apache",
      compressible: true
    },
    "application/vnd.ms-printschematicket+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ms-project": {
      source: "iana",
      extensions: ["mpp", "mpt"]
    },
    "application/vnd.ms-tnef": {
      source: "iana"
    },
    "application/vnd.ms-windows.devicepairing": {
      source: "iana"
    },
    "application/vnd.ms-windows.nwprinting.oob": {
      source: "iana"
    },
    "application/vnd.ms-windows.printerpairing": {
      source: "iana"
    },
    "application/vnd.ms-windows.wsd.oob": {
      source: "iana"
    },
    "application/vnd.ms-wmdrm.lic-chlg-req": {
      source: "iana"
    },
    "application/vnd.ms-wmdrm.lic-resp": {
      source: "iana"
    },
    "application/vnd.ms-wmdrm.meter-chlg-req": {
      source: "iana"
    },
    "application/vnd.ms-wmdrm.meter-resp": {
      source: "iana"
    },
    "application/vnd.ms-word.document.macroenabled.12": {
      source: "iana",
      extensions: ["docm"]
    },
    "application/vnd.ms-word.template.macroenabled.12": {
      source: "iana",
      extensions: ["dotm"]
    },
    "application/vnd.ms-works": {
      source: "iana",
      extensions: ["wps", "wks", "wcm", "wdb"]
    },
    "application/vnd.ms-wpl": {
      source: "iana",
      extensions: ["wpl"]
    },
    "application/vnd.ms-xpsdocument": {
      source: "iana",
      compressible: false,
      extensions: ["xps"]
    },
    "application/vnd.msa-disk-image": {
      source: "iana"
    },
    "application/vnd.mseq": {
      source: "iana",
      extensions: ["mseq"]
    },
    "application/vnd.msign": {
      source: "iana"
    },
    "application/vnd.multiad.creator": {
      source: "iana"
    },
    "application/vnd.multiad.creator.cif": {
      source: "iana"
    },
    "application/vnd.music-niff": {
      source: "iana"
    },
    "application/vnd.musician": {
      source: "iana",
      extensions: ["mus"]
    },
    "application/vnd.muvee.style": {
      source: "iana",
      extensions: ["msty"]
    },
    "application/vnd.mynfc": {
      source: "iana",
      extensions: ["taglet"]
    },
    "application/vnd.nacamar.ybrid+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ncd.control": {
      source: "iana"
    },
    "application/vnd.ncd.reference": {
      source: "iana"
    },
    "application/vnd.nearst.inv+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nebumind.line": {
      source: "iana"
    },
    "application/vnd.nervana": {
      source: "iana"
    },
    "application/vnd.netfpx": {
      source: "iana"
    },
    "application/vnd.neurolanguage.nlu": {
      source: "iana",
      extensions: ["nlu"]
    },
    "application/vnd.nimn": {
      source: "iana"
    },
    "application/vnd.nintendo.nitro.rom": {
      source: "iana"
    },
    "application/vnd.nintendo.snes.rom": {
      source: "iana"
    },
    "application/vnd.nitf": {
      source: "iana",
      extensions: ["ntf", "nitf"]
    },
    "application/vnd.noblenet-directory": {
      source: "iana",
      extensions: ["nnd"]
    },
    "application/vnd.noblenet-sealer": {
      source: "iana",
      extensions: ["nns"]
    },
    "application/vnd.noblenet-web": {
      source: "iana",
      extensions: ["nnw"]
    },
    "application/vnd.nokia.catalogs": {
      source: "iana"
    },
    "application/vnd.nokia.conml+wbxml": {
      source: "iana"
    },
    "application/vnd.nokia.conml+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nokia.iptv.config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nokia.isds-radio-presets": {
      source: "iana"
    },
    "application/vnd.nokia.landmark+wbxml": {
      source: "iana"
    },
    "application/vnd.nokia.landmark+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nokia.landmarkcollection+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nokia.n-gage.ac+xml": {
      source: "iana",
      compressible: true,
      extensions: ["ac"]
    },
    "application/vnd.nokia.n-gage.data": {
      source: "iana",
      extensions: ["ngdat"]
    },
    "application/vnd.nokia.n-gage.symbian.install": {
      source: "iana",
      extensions: ["n-gage"]
    },
    "application/vnd.nokia.ncd": {
      source: "iana"
    },
    "application/vnd.nokia.pcd+wbxml": {
      source: "iana"
    },
    "application/vnd.nokia.pcd+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nokia.radio-preset": {
      source: "iana",
      extensions: ["rpst"]
    },
    "application/vnd.nokia.radio-presets": {
      source: "iana",
      extensions: ["rpss"]
    },
    "application/vnd.novadigm.edm": {
      source: "iana",
      extensions: ["edm"]
    },
    "application/vnd.novadigm.edx": {
      source: "iana",
      extensions: ["edx"]
    },
    "application/vnd.novadigm.ext": {
      source: "iana",
      extensions: ["ext"]
    },
    "application/vnd.ntt-local.content-share": {
      source: "iana"
    },
    "application/vnd.ntt-local.file-transfer": {
      source: "iana"
    },
    "application/vnd.ntt-local.ogw_remote-access": {
      source: "iana"
    },
    "application/vnd.ntt-local.sip-ta_remote": {
      source: "iana"
    },
    "application/vnd.ntt-local.sip-ta_tcp_stream": {
      source: "iana"
    },
    "application/vnd.oasis.opendocument.chart": {
      source: "iana",
      extensions: ["odc"]
    },
    "application/vnd.oasis.opendocument.chart-template": {
      source: "iana",
      extensions: ["otc"]
    },
    "application/vnd.oasis.opendocument.database": {
      source: "iana",
      extensions: ["odb"]
    },
    "application/vnd.oasis.opendocument.formula": {
      source: "iana",
      extensions: ["odf"]
    },
    "application/vnd.oasis.opendocument.formula-template": {
      source: "iana",
      extensions: ["odft"]
    },
    "application/vnd.oasis.opendocument.graphics": {
      source: "iana",
      compressible: false,
      extensions: ["odg"]
    },
    "application/vnd.oasis.opendocument.graphics-template": {
      source: "iana",
      extensions: ["otg"]
    },
    "application/vnd.oasis.opendocument.image": {
      source: "iana",
      extensions: ["odi"]
    },
    "application/vnd.oasis.opendocument.image-template": {
      source: "iana",
      extensions: ["oti"]
    },
    "application/vnd.oasis.opendocument.presentation": {
      source: "iana",
      compressible: false,
      extensions: ["odp"]
    },
    "application/vnd.oasis.opendocument.presentation-template": {
      source: "iana",
      extensions: ["otp"]
    },
    "application/vnd.oasis.opendocument.spreadsheet": {
      source: "iana",
      compressible: false,
      extensions: ["ods"]
    },
    "application/vnd.oasis.opendocument.spreadsheet-template": {
      source: "iana",
      extensions: ["ots"]
    },
    "application/vnd.oasis.opendocument.text": {
      source: "iana",
      compressible: false,
      extensions: ["odt"]
    },
    "application/vnd.oasis.opendocument.text-master": {
      source: "iana",
      extensions: ["odm"]
    },
    "application/vnd.oasis.opendocument.text-template": {
      source: "iana",
      extensions: ["ott"]
    },
    "application/vnd.oasis.opendocument.text-web": {
      source: "iana",
      extensions: ["oth"]
    },
    "application/vnd.obn": {
      source: "iana"
    },
    "application/vnd.ocf+cbor": {
      source: "iana"
    },
    "application/vnd.oci.image.manifest.v1+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oftn.l10n+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.contentaccessdownload+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.contentaccessstreaming+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.cspg-hexbinary": {
      source: "iana"
    },
    "application/vnd.oipf.dae.svg+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.dae.xhtml+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.mippvcontrolmessage+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.pae.gem": {
      source: "iana"
    },
    "application/vnd.oipf.spdiscovery+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.spdlist+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.ueprofile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.userprofile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.olpc-sugar": {
      source: "iana",
      extensions: ["xo"]
    },
    "application/vnd.oma-scws-config": {
      source: "iana"
    },
    "application/vnd.oma-scws-http-request": {
      source: "iana"
    },
    "application/vnd.oma-scws-http-response": {
      source: "iana"
    },
    "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.drm-trigger+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.imd+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.ltkm": {
      source: "iana"
    },
    "application/vnd.oma.bcast.notification+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.provisioningtrigger": {
      source: "iana"
    },
    "application/vnd.oma.bcast.sgboot": {
      source: "iana"
    },
    "application/vnd.oma.bcast.sgdd+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.sgdu": {
      source: "iana"
    },
    "application/vnd.oma.bcast.simple-symbol-container": {
      source: "iana"
    },
    "application/vnd.oma.bcast.smartcard-trigger+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.sprov+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.stkm": {
      source: "iana"
    },
    "application/vnd.oma.cab-address-book+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.cab-feature-handler+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.cab-pcc+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.cab-subs-invite+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.cab-user-prefs+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.dcd": {
      source: "iana"
    },
    "application/vnd.oma.dcdc": {
      source: "iana"
    },
    "application/vnd.oma.dd2+xml": {
      source: "iana",
      compressible: true,
      extensions: ["dd2"]
    },
    "application/vnd.oma.drm.risd+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.group-usage-list+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.lwm2m+cbor": {
      source: "iana"
    },
    "application/vnd.oma.lwm2m+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.lwm2m+tlv": {
      source: "iana"
    },
    "application/vnd.oma.pal+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.poc.detailed-progress-report+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.poc.final-report+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.poc.groups+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.poc.invocation-descriptor+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.poc.optimized-progress-report+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.push": {
      source: "iana"
    },
    "application/vnd.oma.scidm.messages+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.xcap-directory+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.omads-email+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.omads-file+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.omads-folder+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.omaloc-supl-init": {
      source: "iana"
    },
    "application/vnd.onepager": {
      source: "iana"
    },
    "application/vnd.onepagertamp": {
      source: "iana"
    },
    "application/vnd.onepagertamx": {
      source: "iana"
    },
    "application/vnd.onepagertat": {
      source: "iana"
    },
    "application/vnd.onepagertatp": {
      source: "iana"
    },
    "application/vnd.onepagertatx": {
      source: "iana"
    },
    "application/vnd.openblox.game+xml": {
      source: "iana",
      compressible: true,
      extensions: ["obgx"]
    },
    "application/vnd.openblox.game-binary": {
      source: "iana"
    },
    "application/vnd.openeye.oeb": {
      source: "iana"
    },
    "application/vnd.openofficeorg.extension": {
      source: "apache",
      extensions: ["oxt"]
    },
    "application/vnd.openstreetmap.data+xml": {
      source: "iana",
      compressible: true,
      extensions: ["osm"]
    },
    "application/vnd.opentimestamps.ots": {
      source: "iana"
    },
    "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawing+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
      source: "iana",
      compressible: false,
      extensions: ["pptx"]
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slide": {
      source: "iana",
      extensions: ["sldx"]
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
      source: "iana",
      extensions: ["ppsx"]
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.template": {
      source: "iana",
      extensions: ["potx"]
    },
    "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      source: "iana",
      compressible: false,
      extensions: ["xlsx"]
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
      source: "iana",
      extensions: ["xltx"]
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.theme+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.vmldrawing": {
      source: "iana"
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      source: "iana",
      compressible: false,
      extensions: ["docx"]
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
      source: "iana",
      extensions: ["dotx"]
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-package.core-properties+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-package.relationships+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oracle.resource+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.orange.indata": {
      source: "iana"
    },
    "application/vnd.osa.netdeploy": {
      source: "iana"
    },
    "application/vnd.osgeo.mapguide.package": {
      source: "iana",
      extensions: ["mgp"]
    },
    "application/vnd.osgi.bundle": {
      source: "iana"
    },
    "application/vnd.osgi.dp": {
      source: "iana",
      extensions: ["dp"]
    },
    "application/vnd.osgi.subsystem": {
      source: "iana",
      extensions: ["esa"]
    },
    "application/vnd.otps.ct-kip+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oxli.countgraph": {
      source: "iana"
    },
    "application/vnd.pagerduty+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.palm": {
      source: "iana",
      extensions: ["pdb", "pqa", "oprc"]
    },
    "application/vnd.panoply": {
      source: "iana"
    },
    "application/vnd.paos.xml": {
      source: "iana"
    },
    "application/vnd.patentdive": {
      source: "iana"
    },
    "application/vnd.patientecommsdoc": {
      source: "iana"
    },
    "application/vnd.pawaafile": {
      source: "iana",
      extensions: ["paw"]
    },
    "application/vnd.pcos": {
      source: "iana"
    },
    "application/vnd.pg.format": {
      source: "iana",
      extensions: ["str"]
    },
    "application/vnd.pg.osasli": {
      source: "iana",
      extensions: ["ei6"]
    },
    "application/vnd.piaccess.application-licence": {
      source: "iana"
    },
    "application/vnd.picsel": {
      source: "iana",
      extensions: ["efif"]
    },
    "application/vnd.pmi.widget": {
      source: "iana",
      extensions: ["wg"]
    },
    "application/vnd.poc.group-advertisement+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.pocketlearn": {
      source: "iana",
      extensions: ["plf"]
    },
    "application/vnd.powerbuilder6": {
      source: "iana",
      extensions: ["pbd"]
    },
    "application/vnd.powerbuilder6-s": {
      source: "iana"
    },
    "application/vnd.powerbuilder7": {
      source: "iana"
    },
    "application/vnd.powerbuilder7-s": {
      source: "iana"
    },
    "application/vnd.powerbuilder75": {
      source: "iana"
    },
    "application/vnd.powerbuilder75-s": {
      source: "iana"
    },
    "application/vnd.preminet": {
      source: "iana"
    },
    "application/vnd.previewsystems.box": {
      source: "iana",
      extensions: ["box"]
    },
    "application/vnd.proteus.magazine": {
      source: "iana",
      extensions: ["mgz"]
    },
    "application/vnd.psfs": {
      source: "iana"
    },
    "application/vnd.publishare-delta-tree": {
      source: "iana",
      extensions: ["qps"]
    },
    "application/vnd.pvi.ptid1": {
      source: "iana",
      extensions: ["ptid"]
    },
    "application/vnd.pwg-multiplexed": {
      source: "iana"
    },
    "application/vnd.pwg-xhtml-print+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.qualcomm.brew-app-res": {
      source: "iana"
    },
    "application/vnd.quarantainenet": {
      source: "iana"
    },
    "application/vnd.quark.quarkxpress": {
      source: "iana",
      extensions: ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"]
    },
    "application/vnd.quobject-quoxdocument": {
      source: "iana"
    },
    "application/vnd.radisys.moml+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-audit+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-audit-conf+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-audit-conn+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-audit-dialog+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-audit-stream+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-conf+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-base+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-fax-detect+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-group+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-speech+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-transform+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.rainstor.data": {
      source: "iana"
    },
    "application/vnd.rapid": {
      source: "iana"
    },
    "application/vnd.rar": {
      source: "iana",
      extensions: ["rar"]
    },
    "application/vnd.realvnc.bed": {
      source: "iana",
      extensions: ["bed"]
    },
    "application/vnd.recordare.musicxml": {
      source: "iana",
      extensions: ["mxl"]
    },
    "application/vnd.recordare.musicxml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["musicxml"]
    },
    "application/vnd.renlearn.rlprint": {
      source: "iana"
    },
    "application/vnd.resilient.logic": {
      source: "iana"
    },
    "application/vnd.restful+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.rig.cryptonote": {
      source: "iana",
      extensions: ["cryptonote"]
    },
    "application/vnd.rim.cod": {
      source: "apache",
      extensions: ["cod"]
    },
    "application/vnd.rn-realmedia": {
      source: "apache",
      extensions: ["rm"]
    },
    "application/vnd.rn-realmedia-vbr": {
      source: "apache",
      extensions: ["rmvb"]
    },
    "application/vnd.route66.link66+xml": {
      source: "iana",
      compressible: true,
      extensions: ["link66"]
    },
    "application/vnd.rs-274x": {
      source: "iana"
    },
    "application/vnd.ruckus.download": {
      source: "iana"
    },
    "application/vnd.s3sms": {
      source: "iana"
    },
    "application/vnd.sailingtracker.track": {
      source: "iana",
      extensions: ["st"]
    },
    "application/vnd.sar": {
      source: "iana"
    },
    "application/vnd.sbm.cid": {
      source: "iana"
    },
    "application/vnd.sbm.mid2": {
      source: "iana"
    },
    "application/vnd.scribus": {
      source: "iana"
    },
    "application/vnd.sealed.3df": {
      source: "iana"
    },
    "application/vnd.sealed.csf": {
      source: "iana"
    },
    "application/vnd.sealed.doc": {
      source: "iana"
    },
    "application/vnd.sealed.eml": {
      source: "iana"
    },
    "application/vnd.sealed.mht": {
      source: "iana"
    },
    "application/vnd.sealed.net": {
      source: "iana"
    },
    "application/vnd.sealed.ppt": {
      source: "iana"
    },
    "application/vnd.sealed.tiff": {
      source: "iana"
    },
    "application/vnd.sealed.xls": {
      source: "iana"
    },
    "application/vnd.sealedmedia.softseal.html": {
      source: "iana"
    },
    "application/vnd.sealedmedia.softseal.pdf": {
      source: "iana"
    },
    "application/vnd.seemail": {
      source: "iana",
      extensions: ["see"]
    },
    "application/vnd.seis+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.sema": {
      source: "iana",
      extensions: ["sema"]
    },
    "application/vnd.semd": {
      source: "iana",
      extensions: ["semd"]
    },
    "application/vnd.semf": {
      source: "iana",
      extensions: ["semf"]
    },
    "application/vnd.shade-save-file": {
      source: "iana"
    },
    "application/vnd.shana.informed.formdata": {
      source: "iana",
      extensions: ["ifm"]
    },
    "application/vnd.shana.informed.formtemplate": {
      source: "iana",
      extensions: ["itp"]
    },
    "application/vnd.shana.informed.interchange": {
      source: "iana",
      extensions: ["iif"]
    },
    "application/vnd.shana.informed.package": {
      source: "iana",
      extensions: ["ipk"]
    },
    "application/vnd.shootproof+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.shopkick+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.shp": {
      source: "iana"
    },
    "application/vnd.shx": {
      source: "iana"
    },
    "application/vnd.sigrok.session": {
      source: "iana"
    },
    "application/vnd.simtech-mindmapper": {
      source: "iana",
      extensions: ["twd", "twds"]
    },
    "application/vnd.siren+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.smaf": {
      source: "iana",
      extensions: ["mmf"]
    },
    "application/vnd.smart.notebook": {
      source: "iana"
    },
    "application/vnd.smart.teacher": {
      source: "iana",
      extensions: ["teacher"]
    },
    "application/vnd.snesdev-page-table": {
      source: "iana"
    },
    "application/vnd.software602.filler.form+xml": {
      source: "iana",
      compressible: true,
      extensions: ["fo"]
    },
    "application/vnd.software602.filler.form-xml-zip": {
      source: "iana"
    },
    "application/vnd.solent.sdkm+xml": {
      source: "iana",
      compressible: true,
      extensions: ["sdkm", "sdkd"]
    },
    "application/vnd.spotfire.dxp": {
      source: "iana",
      extensions: ["dxp"]
    },
    "application/vnd.spotfire.sfs": {
      source: "iana",
      extensions: ["sfs"]
    },
    "application/vnd.sqlite3": {
      source: "iana"
    },
    "application/vnd.sss-cod": {
      source: "iana"
    },
    "application/vnd.sss-dtf": {
      source: "iana"
    },
    "application/vnd.sss-ntf": {
      source: "iana"
    },
    "application/vnd.stardivision.calc": {
      source: "apache",
      extensions: ["sdc"]
    },
    "application/vnd.stardivision.draw": {
      source: "apache",
      extensions: ["sda"]
    },
    "application/vnd.stardivision.impress": {
      source: "apache",
      extensions: ["sdd"]
    },
    "application/vnd.stardivision.math": {
      source: "apache",
      extensions: ["smf"]
    },
    "application/vnd.stardivision.writer": {
      source: "apache",
      extensions: ["sdw", "vor"]
    },
    "application/vnd.stardivision.writer-global": {
      source: "apache",
      extensions: ["sgl"]
    },
    "application/vnd.stepmania.package": {
      source: "iana",
      extensions: ["smzip"]
    },
    "application/vnd.stepmania.stepchart": {
      source: "iana",
      extensions: ["sm"]
    },
    "application/vnd.street-stream": {
      source: "iana"
    },
    "application/vnd.sun.wadl+xml": {
      source: "iana",
      compressible: true,
      extensions: ["wadl"]
    },
    "application/vnd.sun.xml.calc": {
      source: "apache",
      extensions: ["sxc"]
    },
    "application/vnd.sun.xml.calc.template": {
      source: "apache",
      extensions: ["stc"]
    },
    "application/vnd.sun.xml.draw": {
      source: "apache",
      extensions: ["sxd"]
    },
    "application/vnd.sun.xml.draw.template": {
      source: "apache",
      extensions: ["std"]
    },
    "application/vnd.sun.xml.impress": {
      source: "apache",
      extensions: ["sxi"]
    },
    "application/vnd.sun.xml.impress.template": {
      source: "apache",
      extensions: ["sti"]
    },
    "application/vnd.sun.xml.math": {
      source: "apache",
      extensions: ["sxm"]
    },
    "application/vnd.sun.xml.writer": {
      source: "apache",
      extensions: ["sxw"]
    },
    "application/vnd.sun.xml.writer.global": {
      source: "apache",
      extensions: ["sxg"]
    },
    "application/vnd.sun.xml.writer.template": {
      source: "apache",
      extensions: ["stw"]
    },
    "application/vnd.sus-calendar": {
      source: "iana",
      extensions: ["sus", "susp"]
    },
    "application/vnd.svd": {
      source: "iana",
      extensions: ["svd"]
    },
    "application/vnd.swiftview-ics": {
      source: "iana"
    },
    "application/vnd.sycle+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.syft+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.symbian.install": {
      source: "apache",
      extensions: ["sis", "sisx"]
    },
    "application/vnd.syncml+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["xsm"]
    },
    "application/vnd.syncml.dm+wbxml": {
      source: "iana",
      charset: "UTF-8",
      extensions: ["bdm"]
    },
    "application/vnd.syncml.dm+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["xdm"]
    },
    "application/vnd.syncml.dm.notification": {
      source: "iana"
    },
    "application/vnd.syncml.dmddf+wbxml": {
      source: "iana"
    },
    "application/vnd.syncml.dmddf+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["ddf"]
    },
    "application/vnd.syncml.dmtnds+wbxml": {
      source: "iana"
    },
    "application/vnd.syncml.dmtnds+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.syncml.ds.notification": {
      source: "iana"
    },
    "application/vnd.tableschema+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.tao.intent-module-archive": {
      source: "iana",
      extensions: ["tao"]
    },
    "application/vnd.tcpdump.pcap": {
      source: "iana",
      extensions: ["pcap", "cap", "dmp"]
    },
    "application/vnd.think-cell.ppttc+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.tmd.mediaflex.api+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.tml": {
      source: "iana"
    },
    "application/vnd.tmobile-livetv": {
      source: "iana",
      extensions: ["tmo"]
    },
    "application/vnd.tri.onesource": {
      source: "iana"
    },
    "application/vnd.trid.tpt": {
      source: "iana",
      extensions: ["tpt"]
    },
    "application/vnd.triscape.mxs": {
      source: "iana",
      extensions: ["mxs"]
    },
    "application/vnd.trueapp": {
      source: "iana",
      extensions: ["tra"]
    },
    "application/vnd.truedoc": {
      source: "iana"
    },
    "application/vnd.ubisoft.webplayer": {
      source: "iana"
    },
    "application/vnd.ufdl": {
      source: "iana",
      extensions: ["ufd", "ufdl"]
    },
    "application/vnd.uiq.theme": {
      source: "iana",
      extensions: ["utz"]
    },
    "application/vnd.umajin": {
      source: "iana",
      extensions: ["umj"]
    },
    "application/vnd.unity": {
      source: "iana",
      extensions: ["unityweb"]
    },
    "application/vnd.uoml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["uoml"]
    },
    "application/vnd.uplanet.alert": {
      source: "iana"
    },
    "application/vnd.uplanet.alert-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.bearer-choice": {
      source: "iana"
    },
    "application/vnd.uplanet.bearer-choice-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.cacheop": {
      source: "iana"
    },
    "application/vnd.uplanet.cacheop-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.channel": {
      source: "iana"
    },
    "application/vnd.uplanet.channel-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.list": {
      source: "iana"
    },
    "application/vnd.uplanet.list-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.listcmd": {
      source: "iana"
    },
    "application/vnd.uplanet.listcmd-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.signal": {
      source: "iana"
    },
    "application/vnd.uri-map": {
      source: "iana"
    },
    "application/vnd.valve.source.material": {
      source: "iana"
    },
    "application/vnd.vcx": {
      source: "iana",
      extensions: ["vcx"]
    },
    "application/vnd.vd-study": {
      source: "iana"
    },
    "application/vnd.vectorworks": {
      source: "iana"
    },
    "application/vnd.vel+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.verimatrix.vcas": {
      source: "iana"
    },
    "application/vnd.veritone.aion+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.veryant.thin": {
      source: "iana"
    },
    "application/vnd.ves.encrypted": {
      source: "iana"
    },
    "application/vnd.vidsoft.vidconference": {
      source: "iana"
    },
    "application/vnd.visio": {
      source: "iana",
      extensions: ["vsd", "vst", "vss", "vsw"]
    },
    "application/vnd.visionary": {
      source: "iana",
      extensions: ["vis"]
    },
    "application/vnd.vividence.scriptfile": {
      source: "iana"
    },
    "application/vnd.vsf": {
      source: "iana",
      extensions: ["vsf"]
    },
    "application/vnd.wap.sic": {
      source: "iana"
    },
    "application/vnd.wap.slc": {
      source: "iana"
    },
    "application/vnd.wap.wbxml": {
      source: "iana",
      charset: "UTF-8",
      extensions: ["wbxml"]
    },
    "application/vnd.wap.wmlc": {
      source: "iana",
      extensions: ["wmlc"]
    },
    "application/vnd.wap.wmlscriptc": {
      source: "iana",
      extensions: ["wmlsc"]
    },
    "application/vnd.webturbo": {
      source: "iana",
      extensions: ["wtb"]
    },
    "application/vnd.wfa.dpp": {
      source: "iana"
    },
    "application/vnd.wfa.p2p": {
      source: "iana"
    },
    "application/vnd.wfa.wsc": {
      source: "iana"
    },
    "application/vnd.windows.devicepairing": {
      source: "iana"
    },
    "application/vnd.wmc": {
      source: "iana"
    },
    "application/vnd.wmf.bootstrap": {
      source: "iana"
    },
    "application/vnd.wolfram.mathematica": {
      source: "iana"
    },
    "application/vnd.wolfram.mathematica.package": {
      source: "iana"
    },
    "application/vnd.wolfram.player": {
      source: "iana",
      extensions: ["nbp"]
    },
    "application/vnd.wordperfect": {
      source: "iana",
      extensions: ["wpd"]
    },
    "application/vnd.wqd": {
      source: "iana",
      extensions: ["wqd"]
    },
    "application/vnd.wrq-hp3000-labelled": {
      source: "iana"
    },
    "application/vnd.wt.stf": {
      source: "iana",
      extensions: ["stf"]
    },
    "application/vnd.wv.csp+wbxml": {
      source: "iana"
    },
    "application/vnd.wv.csp+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.wv.ssp+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.xacml+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.xara": {
      source: "iana",
      extensions: ["xar"]
    },
    "application/vnd.xfdl": {
      source: "iana",
      extensions: ["xfdl"]
    },
    "application/vnd.xfdl.webform": {
      source: "iana"
    },
    "application/vnd.xmi+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.xmpie.cpkg": {
      source: "iana"
    },
    "application/vnd.xmpie.dpkg": {
      source: "iana"
    },
    "application/vnd.xmpie.plan": {
      source: "iana"
    },
    "application/vnd.xmpie.ppkg": {
      source: "iana"
    },
    "application/vnd.xmpie.xlim": {
      source: "iana"
    },
    "application/vnd.yamaha.hv-dic": {
      source: "iana",
      extensions: ["hvd"]
    },
    "application/vnd.yamaha.hv-script": {
      source: "iana",
      extensions: ["hvs"]
    },
    "application/vnd.yamaha.hv-voice": {
      source: "iana",
      extensions: ["hvp"]
    },
    "application/vnd.yamaha.openscoreformat": {
      source: "iana",
      extensions: ["osf"]
    },
    "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
      source: "iana",
      compressible: true,
      extensions: ["osfpvg"]
    },
    "application/vnd.yamaha.remote-setup": {
      source: "iana"
    },
    "application/vnd.yamaha.smaf-audio": {
      source: "iana",
      extensions: ["saf"]
    },
    "application/vnd.yamaha.smaf-phrase": {
      source: "iana",
      extensions: ["spf"]
    },
    "application/vnd.yamaha.through-ngn": {
      source: "iana"
    },
    "application/vnd.yamaha.tunnel-udpencap": {
      source: "iana"
    },
    "application/vnd.yaoweme": {
      source: "iana"
    },
    "application/vnd.yellowriver-custom-menu": {
      source: "iana",
      extensions: ["cmp"]
    },
    "application/vnd.youtube.yt": {
      source: "iana"
    },
    "application/vnd.zul": {
      source: "iana",
      extensions: ["zir", "zirz"]
    },
    "application/vnd.zzazz.deck+xml": {
      source: "iana",
      compressible: true,
      extensions: ["zaz"]
    },
    "application/voicexml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["vxml"]
    },
    "application/voucher-cms+json": {
      source: "iana",
      compressible: true
    },
    "application/vq-rtcpxr": {
      source: "iana"
    },
    "application/wasm": {
      source: "iana",
      compressible: true,
      extensions: ["wasm"]
    },
    "application/watcherinfo+xml": {
      source: "iana",
      compressible: true,
      extensions: ["wif"]
    },
    "application/webpush-options+json": {
      source: "iana",
      compressible: true
    },
    "application/whoispp-query": {
      source: "iana"
    },
    "application/whoispp-response": {
      source: "iana"
    },
    "application/widget": {
      source: "iana",
      extensions: ["wgt"]
    },
    "application/winhlp": {
      source: "apache",
      extensions: ["hlp"]
    },
    "application/wita": {
      source: "iana"
    },
    "application/wordperfect5.1": {
      source: "iana"
    },
    "application/wsdl+xml": {
      source: "iana",
      compressible: true,
      extensions: ["wsdl"]
    },
    "application/wspolicy+xml": {
      source: "iana",
      compressible: true,
      extensions: ["wspolicy"]
    },
    "application/x-7z-compressed": {
      source: "apache",
      compressible: false,
      extensions: ["7z"]
    },
    "application/x-abiword": {
      source: "apache",
      extensions: ["abw"]
    },
    "application/x-ace-compressed": {
      source: "apache",
      extensions: ["ace"]
    },
    "application/x-amf": {
      source: "apache"
    },
    "application/x-apple-diskimage": {
      source: "apache",
      extensions: ["dmg"]
    },
    "application/x-arj": {
      compressible: false,
      extensions: ["arj"]
    },
    "application/x-authorware-bin": {
      source: "apache",
      extensions: ["aab", "x32", "u32", "vox"]
    },
    "application/x-authorware-map": {
      source: "apache",
      extensions: ["aam"]
    },
    "application/x-authorware-seg": {
      source: "apache",
      extensions: ["aas"]
    },
    "application/x-bcpio": {
      source: "apache",
      extensions: ["bcpio"]
    },
    "application/x-bdoc": {
      compressible: false,
      extensions: ["bdoc"]
    },
    "application/x-bittorrent": {
      source: "apache",
      extensions: ["torrent"]
    },
    "application/x-blorb": {
      source: "apache",
      extensions: ["blb", "blorb"]
    },
    "application/x-bzip": {
      source: "apache",
      compressible: false,
      extensions: ["bz"]
    },
    "application/x-bzip2": {
      source: "apache",
      compressible: false,
      extensions: ["bz2", "boz"]
    },
    "application/x-cbr": {
      source: "apache",
      extensions: ["cbr", "cba", "cbt", "cbz", "cb7"]
    },
    "application/x-cdlink": {
      source: "apache",
      extensions: ["vcd"]
    },
    "application/x-cfs-compressed": {
      source: "apache",
      extensions: ["cfs"]
    },
    "application/x-chat": {
      source: "apache",
      extensions: ["chat"]
    },
    "application/x-chess-pgn": {
      source: "apache",
      extensions: ["pgn"]
    },
    "application/x-chrome-extension": {
      extensions: ["crx"]
    },
    "application/x-cocoa": {
      source: "nginx",
      extensions: ["cco"]
    },
    "application/x-compress": {
      source: "apache"
    },
    "application/x-conference": {
      source: "apache",
      extensions: ["nsc"]
    },
    "application/x-cpio": {
      source: "apache",
      extensions: ["cpio"]
    },
    "application/x-csh": {
      source: "apache",
      extensions: ["csh"]
    },
    "application/x-deb": {
      compressible: false
    },
    "application/x-debian-package": {
      source: "apache",
      extensions: ["deb", "udeb"]
    },
    "application/x-dgc-compressed": {
      source: "apache",
      extensions: ["dgc"]
    },
    "application/x-director": {
      source: "apache",
      extensions: ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"]
    },
    "application/x-doom": {
      source: "apache",
      extensions: ["wad"]
    },
    "application/x-dtbncx+xml": {
      source: "apache",
      compressible: true,
      extensions: ["ncx"]
    },
    "application/x-dtbook+xml": {
      source: "apache",
      compressible: true,
      extensions: ["dtb"]
    },
    "application/x-dtbresource+xml": {
      source: "apache",
      compressible: true,
      extensions: ["res"]
    },
    "application/x-dvi": {
      source: "apache",
      compressible: false,
      extensions: ["dvi"]
    },
    "application/x-envoy": {
      source: "apache",
      extensions: ["evy"]
    },
    "application/x-eva": {
      source: "apache",
      extensions: ["eva"]
    },
    "application/x-font-bdf": {
      source: "apache",
      extensions: ["bdf"]
    },
    "application/x-font-dos": {
      source: "apache"
    },
    "application/x-font-framemaker": {
      source: "apache"
    },
    "application/x-font-ghostscript": {
      source: "apache",
      extensions: ["gsf"]
    },
    "application/x-font-libgrx": {
      source: "apache"
    },
    "application/x-font-linux-psf": {
      source: "apache",
      extensions: ["psf"]
    },
    "application/x-font-pcf": {
      source: "apache",
      extensions: ["pcf"]
    },
    "application/x-font-snf": {
      source: "apache",
      extensions: ["snf"]
    },
    "application/x-font-speedo": {
      source: "apache"
    },
    "application/x-font-sunos-news": {
      source: "apache"
    },
    "application/x-font-type1": {
      source: "apache",
      extensions: ["pfa", "pfb", "pfm", "afm"]
    },
    "application/x-font-vfont": {
      source: "apache"
    },
    "application/x-freearc": {
      source: "apache",
      extensions: ["arc"]
    },
    "application/x-futuresplash": {
      source: "apache",
      extensions: ["spl"]
    },
    "application/x-gca-compressed": {
      source: "apache",
      extensions: ["gca"]
    },
    "application/x-glulx": {
      source: "apache",
      extensions: ["ulx"]
    },
    "application/x-gnumeric": {
      source: "apache",
      extensions: ["gnumeric"]
    },
    "application/x-gramps-xml": {
      source: "apache",
      extensions: ["gramps"]
    },
    "application/x-gtar": {
      source: "apache",
      extensions: ["gtar"]
    },
    "application/x-gzip": {
      source: "apache"
    },
    "application/x-hdf": {
      source: "apache",
      extensions: ["hdf"]
    },
    "application/x-httpd-php": {
      compressible: true,
      extensions: ["php"]
    },
    "application/x-install-instructions": {
      source: "apache",
      extensions: ["install"]
    },
    "application/x-iso9660-image": {
      source: "apache",
      extensions: ["iso"]
    },
    "application/x-iwork-keynote-sffkey": {
      extensions: ["key"]
    },
    "application/x-iwork-numbers-sffnumbers": {
      extensions: ["numbers"]
    },
    "application/x-iwork-pages-sffpages": {
      extensions: ["pages"]
    },
    "application/x-java-archive-diff": {
      source: "nginx",
      extensions: ["jardiff"]
    },
    "application/x-java-jnlp-file": {
      source: "apache",
      compressible: false,
      extensions: ["jnlp"]
    },
    "application/x-javascript": {
      compressible: true
    },
    "application/x-keepass2": {
      extensions: ["kdbx"]
    },
    "application/x-latex": {
      source: "apache",
      compressible: false,
      extensions: ["latex"]
    },
    "application/x-lua-bytecode": {
      extensions: ["luac"]
    },
    "application/x-lzh-compressed": {
      source: "apache",
      extensions: ["lzh", "lha"]
    },
    "application/x-makeself": {
      source: "nginx",
      extensions: ["run"]
    },
    "application/x-mie": {
      source: "apache",
      extensions: ["mie"]
    },
    "application/x-mobipocket-ebook": {
      source: "apache",
      extensions: ["prc", "mobi"]
    },
    "application/x-mpegurl": {
      compressible: false
    },
    "application/x-ms-application": {
      source: "apache",
      extensions: ["application"]
    },
    "application/x-ms-shortcut": {
      source: "apache",
      extensions: ["lnk"]
    },
    "application/x-ms-wmd": {
      source: "apache",
      extensions: ["wmd"]
    },
    "application/x-ms-wmz": {
      source: "apache",
      extensions: ["wmz"]
    },
    "application/x-ms-xbap": {
      source: "apache",
      extensions: ["xbap"]
    },
    "application/x-msaccess": {
      source: "apache",
      extensions: ["mdb"]
    },
    "application/x-msbinder": {
      source: "apache",
      extensions: ["obd"]
    },
    "application/x-mscardfile": {
      source: "apache",
      extensions: ["crd"]
    },
    "application/x-msclip": {
      source: "apache",
      extensions: ["clp"]
    },
    "application/x-msdos-program": {
      extensions: ["exe"]
    },
    "application/x-msdownload": {
      source: "apache",
      extensions: ["exe", "dll", "com", "bat", "msi"]
    },
    "application/x-msmediaview": {
      source: "apache",
      extensions: ["mvb", "m13", "m14"]
    },
    "application/x-msmetafile": {
      source: "apache",
      extensions: ["wmf", "wmz", "emf", "emz"]
    },
    "application/x-msmoney": {
      source: "apache",
      extensions: ["mny"]
    },
    "application/x-mspublisher": {
      source: "apache",
      extensions: ["pub"]
    },
    "application/x-msschedule": {
      source: "apache",
      extensions: ["scd"]
    },
    "application/x-msterminal": {
      source: "apache",
      extensions: ["trm"]
    },
    "application/x-mswrite": {
      source: "apache",
      extensions: ["wri"]
    },
    "application/x-netcdf": {
      source: "apache",
      extensions: ["nc", "cdf"]
    },
    "application/x-ns-proxy-autoconfig": {
      compressible: true,
      extensions: ["pac"]
    },
    "application/x-nzb": {
      source: "apache",
      extensions: ["nzb"]
    },
    "application/x-perl": {
      source: "nginx",
      extensions: ["pl", "pm"]
    },
    "application/x-pilot": {
      source: "nginx",
      extensions: ["prc", "pdb"]
    },
    "application/x-pkcs12": {
      source: "apache",
      compressible: false,
      extensions: ["p12", "pfx"]
    },
    "application/x-pkcs7-certificates": {
      source: "apache",
      extensions: ["p7b", "spc"]
    },
    "application/x-pkcs7-certreqresp": {
      source: "apache",
      extensions: ["p7r"]
    },
    "application/x-pki-message": {
      source: "iana"
    },
    "application/x-rar-compressed": {
      source: "apache",
      compressible: false,
      extensions: ["rar"]
    },
    "application/x-redhat-package-manager": {
      source: "nginx",
      extensions: ["rpm"]
    },
    "application/x-research-info-systems": {
      source: "apache",
      extensions: ["ris"]
    },
    "application/x-sea": {
      source: "nginx",
      extensions: ["sea"]
    },
    "application/x-sh": {
      source: "apache",
      compressible: true,
      extensions: ["sh"]
    },
    "application/x-shar": {
      source: "apache",
      extensions: ["shar"]
    },
    "application/x-shockwave-flash": {
      source: "apache",
      compressible: false,
      extensions: ["swf"]
    },
    "application/x-silverlight-app": {
      source: "apache",
      extensions: ["xap"]
    },
    "application/x-sql": {
      source: "apache",
      extensions: ["sql"]
    },
    "application/x-stuffit": {
      source: "apache",
      compressible: false,
      extensions: ["sit"]
    },
    "application/x-stuffitx": {
      source: "apache",
      extensions: ["sitx"]
    },
    "application/x-subrip": {
      source: "apache",
      extensions: ["srt"]
    },
    "application/x-sv4cpio": {
      source: "apache",
      extensions: ["sv4cpio"]
    },
    "application/x-sv4crc": {
      source: "apache",
      extensions: ["sv4crc"]
    },
    "application/x-t3vm-image": {
      source: "apache",
      extensions: ["t3"]
    },
    "application/x-tads": {
      source: "apache",
      extensions: ["gam"]
    },
    "application/x-tar": {
      source: "apache",
      compressible: true,
      extensions: ["tar"]
    },
    "application/x-tcl": {
      source: "apache",
      extensions: ["tcl", "tk"]
    },
    "application/x-tex": {
      source: "apache",
      extensions: ["tex"]
    },
    "application/x-tex-tfm": {
      source: "apache",
      extensions: ["tfm"]
    },
    "application/x-texinfo": {
      source: "apache",
      extensions: ["texinfo", "texi"]
    },
    "application/x-tgif": {
      source: "apache",
      extensions: ["obj"]
    },
    "application/x-ustar": {
      source: "apache",
      extensions: ["ustar"]
    },
    "application/x-virtualbox-hdd": {
      compressible: true,
      extensions: ["hdd"]
    },
    "application/x-virtualbox-ova": {
      compressible: true,
      extensions: ["ova"]
    },
    "application/x-virtualbox-ovf": {
      compressible: true,
      extensions: ["ovf"]
    },
    "application/x-virtualbox-vbox": {
      compressible: true,
      extensions: ["vbox"]
    },
    "application/x-virtualbox-vbox-extpack": {
      compressible: false,
      extensions: ["vbox-extpack"]
    },
    "application/x-virtualbox-vdi": {
      compressible: true,
      extensions: ["vdi"]
    },
    "application/x-virtualbox-vhd": {
      compressible: true,
      extensions: ["vhd"]
    },
    "application/x-virtualbox-vmdk": {
      compressible: true,
      extensions: ["vmdk"]
    },
    "application/x-wais-source": {
      source: "apache",
      extensions: ["src"]
    },
    "application/x-web-app-manifest+json": {
      compressible: true,
      extensions: ["webapp"]
    },
    "application/x-www-form-urlencoded": {
      source: "iana",
      compressible: true
    },
    "application/x-x509-ca-cert": {
      source: "iana",
      extensions: ["der", "crt", "pem"]
    },
    "application/x-x509-ca-ra-cert": {
      source: "iana"
    },
    "application/x-x509-next-ca-cert": {
      source: "iana"
    },
    "application/x-xfig": {
      source: "apache",
      extensions: ["fig"]
    },
    "application/x-xliff+xml": {
      source: "apache",
      compressible: true,
      extensions: ["xlf"]
    },
    "application/x-xpinstall": {
      source: "apache",
      compressible: false,
      extensions: ["xpi"]
    },
    "application/x-xz": {
      source: "apache",
      extensions: ["xz"]
    },
    "application/x-zmachine": {
      source: "apache",
      extensions: ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"]
    },
    "application/x400-bp": {
      source: "iana"
    },
    "application/xacml+xml": {
      source: "iana",
      compressible: true
    },
    "application/xaml+xml": {
      source: "apache",
      compressible: true,
      extensions: ["xaml"]
    },
    "application/xcap-att+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xav"]
    },
    "application/xcap-caps+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xca"]
    },
    "application/xcap-diff+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xdf"]
    },
    "application/xcap-el+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xel"]
    },
    "application/xcap-error+xml": {
      source: "iana",
      compressible: true
    },
    "application/xcap-ns+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xns"]
    },
    "application/xcon-conference-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/xcon-conference-info-diff+xml": {
      source: "iana",
      compressible: true
    },
    "application/xenc+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xenc"]
    },
    "application/xhtml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xhtml", "xht"]
    },
    "application/xhtml-voice+xml": {
      source: "apache",
      compressible: true
    },
    "application/xliff+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xlf"]
    },
    "application/xml": {
      source: "iana",
      compressible: true,
      extensions: ["xml", "xsl", "xsd", "rng"]
    },
    "application/xml-dtd": {
      source: "iana",
      compressible: true,
      extensions: ["dtd"]
    },
    "application/xml-external-parsed-entity": {
      source: "iana"
    },
    "application/xml-patch+xml": {
      source: "iana",
      compressible: true
    },
    "application/xmpp+xml": {
      source: "iana",
      compressible: true
    },
    "application/xop+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xop"]
    },
    "application/xproc+xml": {
      source: "apache",
      compressible: true,
      extensions: ["xpl"]
    },
    "application/xslt+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xsl", "xslt"]
    },
    "application/xspf+xml": {
      source: "apache",
      compressible: true,
      extensions: ["xspf"]
    },
    "application/xv+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mxml", "xhvml", "xvml", "xvm"]
    },
    "application/yang": {
      source: "iana",
      extensions: ["yang"]
    },
    "application/yang-data+json": {
      source: "iana",
      compressible: true
    },
    "application/yang-data+xml": {
      source: "iana",
      compressible: true
    },
    "application/yang-patch+json": {
      source: "iana",
      compressible: true
    },
    "application/yang-patch+xml": {
      source: "iana",
      compressible: true
    },
    "application/yin+xml": {
      source: "iana",
      compressible: true,
      extensions: ["yin"]
    },
    "application/zip": {
      source: "iana",
      compressible: false,
      extensions: ["zip"]
    },
    "application/zlib": {
      source: "iana"
    },
    "application/zstd": {
      source: "iana"
    },
    "audio/1d-interleaved-parityfec": {
      source: "iana"
    },
    "audio/32kadpcm": {
      source: "iana"
    },
    "audio/3gpp": {
      source: "iana",
      compressible: false,
      extensions: ["3gpp"]
    },
    "audio/3gpp2": {
      source: "iana"
    },
    "audio/aac": {
      source: "iana"
    },
    "audio/ac3": {
      source: "iana"
    },
    "audio/adpcm": {
      source: "apache",
      extensions: ["adp"]
    },
    "audio/amr": {
      source: "iana",
      extensions: ["amr"]
    },
    "audio/amr-wb": {
      source: "iana"
    },
    "audio/amr-wb+": {
      source: "iana"
    },
    "audio/aptx": {
      source: "iana"
    },
    "audio/asc": {
      source: "iana"
    },
    "audio/atrac-advanced-lossless": {
      source: "iana"
    },
    "audio/atrac-x": {
      source: "iana"
    },
    "audio/atrac3": {
      source: "iana"
    },
    "audio/basic": {
      source: "iana",
      compressible: false,
      extensions: ["au", "snd"]
    },
    "audio/bv16": {
      source: "iana"
    },
    "audio/bv32": {
      source: "iana"
    },
    "audio/clearmode": {
      source: "iana"
    },
    "audio/cn": {
      source: "iana"
    },
    "audio/dat12": {
      source: "iana"
    },
    "audio/dls": {
      source: "iana"
    },
    "audio/dsr-es201108": {
      source: "iana"
    },
    "audio/dsr-es202050": {
      source: "iana"
    },
    "audio/dsr-es202211": {
      source: "iana"
    },
    "audio/dsr-es202212": {
      source: "iana"
    },
    "audio/dv": {
      source: "iana"
    },
    "audio/dvi4": {
      source: "iana"
    },
    "audio/eac3": {
      source: "iana"
    },
    "audio/encaprtp": {
      source: "iana"
    },
    "audio/evrc": {
      source: "iana"
    },
    "audio/evrc-qcp": {
      source: "iana"
    },
    "audio/evrc0": {
      source: "iana"
    },
    "audio/evrc1": {
      source: "iana"
    },
    "audio/evrcb": {
      source: "iana"
    },
    "audio/evrcb0": {
      source: "iana"
    },
    "audio/evrcb1": {
      source: "iana"
    },
    "audio/evrcnw": {
      source: "iana"
    },
    "audio/evrcnw0": {
      source: "iana"
    },
    "audio/evrcnw1": {
      source: "iana"
    },
    "audio/evrcwb": {
      source: "iana"
    },
    "audio/evrcwb0": {
      source: "iana"
    },
    "audio/evrcwb1": {
      source: "iana"
    },
    "audio/evs": {
      source: "iana"
    },
    "audio/flexfec": {
      source: "iana"
    },
    "audio/fwdred": {
      source: "iana"
    },
    "audio/g711-0": {
      source: "iana"
    },
    "audio/g719": {
      source: "iana"
    },
    "audio/g722": {
      source: "iana"
    },
    "audio/g7221": {
      source: "iana"
    },
    "audio/g723": {
      source: "iana"
    },
    "audio/g726-16": {
      source: "iana"
    },
    "audio/g726-24": {
      source: "iana"
    },
    "audio/g726-32": {
      source: "iana"
    },
    "audio/g726-40": {
      source: "iana"
    },
    "audio/g728": {
      source: "iana"
    },
    "audio/g729": {
      source: "iana"
    },
    "audio/g7291": {
      source: "iana"
    },
    "audio/g729d": {
      source: "iana"
    },
    "audio/g729e": {
      source: "iana"
    },
    "audio/gsm": {
      source: "iana"
    },
    "audio/gsm-efr": {
      source: "iana"
    },
    "audio/gsm-hr-08": {
      source: "iana"
    },
    "audio/ilbc": {
      source: "iana"
    },
    "audio/ip-mr_v2.5": {
      source: "iana"
    },
    "audio/isac": {
      source: "apache"
    },
    "audio/l16": {
      source: "iana"
    },
    "audio/l20": {
      source: "iana"
    },
    "audio/l24": {
      source: "iana",
      compressible: false
    },
    "audio/l8": {
      source: "iana"
    },
    "audio/lpc": {
      source: "iana"
    },
    "audio/melp": {
      source: "iana"
    },
    "audio/melp1200": {
      source: "iana"
    },
    "audio/melp2400": {
      source: "iana"
    },
    "audio/melp600": {
      source: "iana"
    },
    "audio/mhas": {
      source: "iana"
    },
    "audio/midi": {
      source: "apache",
      extensions: ["mid", "midi", "kar", "rmi"]
    },
    "audio/mobile-xmf": {
      source: "iana",
      extensions: ["mxmf"]
    },
    "audio/mp3": {
      compressible: false,
      extensions: ["mp3"]
    },
    "audio/mp4": {
      source: "iana",
      compressible: false,
      extensions: ["m4a", "mp4a"]
    },
    "audio/mp4a-latm": {
      source: "iana"
    },
    "audio/mpa": {
      source: "iana"
    },
    "audio/mpa-robust": {
      source: "iana"
    },
    "audio/mpeg": {
      source: "iana",
      compressible: false,
      extensions: ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"]
    },
    "audio/mpeg4-generic": {
      source: "iana"
    },
    "audio/musepack": {
      source: "apache"
    },
    "audio/ogg": {
      source: "iana",
      compressible: false,
      extensions: ["oga", "ogg", "spx", "opus"]
    },
    "audio/opus": {
      source: "iana"
    },
    "audio/parityfec": {
      source: "iana"
    },
    "audio/pcma": {
      source: "iana"
    },
    "audio/pcma-wb": {
      source: "iana"
    },
    "audio/pcmu": {
      source: "iana"
    },
    "audio/pcmu-wb": {
      source: "iana"
    },
    "audio/prs.sid": {
      source: "iana"
    },
    "audio/qcelp": {
      source: "iana"
    },
    "audio/raptorfec": {
      source: "iana"
    },
    "audio/red": {
      source: "iana"
    },
    "audio/rtp-enc-aescm128": {
      source: "iana"
    },
    "audio/rtp-midi": {
      source: "iana"
    },
    "audio/rtploopback": {
      source: "iana"
    },
    "audio/rtx": {
      source: "iana"
    },
    "audio/s3m": {
      source: "apache",
      extensions: ["s3m"]
    },
    "audio/scip": {
      source: "iana"
    },
    "audio/silk": {
      source: "apache",
      extensions: ["sil"]
    },
    "audio/smv": {
      source: "iana"
    },
    "audio/smv-qcp": {
      source: "iana"
    },
    "audio/smv0": {
      source: "iana"
    },
    "audio/sofa": {
      source: "iana"
    },
    "audio/sp-midi": {
      source: "iana"
    },
    "audio/speex": {
      source: "iana"
    },
    "audio/t140c": {
      source: "iana"
    },
    "audio/t38": {
      source: "iana"
    },
    "audio/telephone-event": {
      source: "iana"
    },
    "audio/tetra_acelp": {
      source: "iana"
    },
    "audio/tetra_acelp_bb": {
      source: "iana"
    },
    "audio/tone": {
      source: "iana"
    },
    "audio/tsvcis": {
      source: "iana"
    },
    "audio/uemclip": {
      source: "iana"
    },
    "audio/ulpfec": {
      source: "iana"
    },
    "audio/usac": {
      source: "iana"
    },
    "audio/vdvi": {
      source: "iana"
    },
    "audio/vmr-wb": {
      source: "iana"
    },
    "audio/vnd.3gpp.iufp": {
      source: "iana"
    },
    "audio/vnd.4sb": {
      source: "iana"
    },
    "audio/vnd.audiokoz": {
      source: "iana"
    },
    "audio/vnd.celp": {
      source: "iana"
    },
    "audio/vnd.cisco.nse": {
      source: "iana"
    },
    "audio/vnd.cmles.radio-events": {
      source: "iana"
    },
    "audio/vnd.cns.anp1": {
      source: "iana"
    },
    "audio/vnd.cns.inf1": {
      source: "iana"
    },
    "audio/vnd.dece.audio": {
      source: "iana",
      extensions: ["uva", "uvva"]
    },
    "audio/vnd.digital-winds": {
      source: "iana",
      extensions: ["eol"]
    },
    "audio/vnd.dlna.adts": {
      source: "iana"
    },
    "audio/vnd.dolby.heaac.1": {
      source: "iana"
    },
    "audio/vnd.dolby.heaac.2": {
      source: "iana"
    },
    "audio/vnd.dolby.mlp": {
      source: "iana"
    },
    "audio/vnd.dolby.mps": {
      source: "iana"
    },
    "audio/vnd.dolby.pl2": {
      source: "iana"
    },
    "audio/vnd.dolby.pl2x": {
      source: "iana"
    },
    "audio/vnd.dolby.pl2z": {
      source: "iana"
    },
    "audio/vnd.dolby.pulse.1": {
      source: "iana"
    },
    "audio/vnd.dra": {
      source: "iana",
      extensions: ["dra"]
    },
    "audio/vnd.dts": {
      source: "iana",
      extensions: ["dts"]
    },
    "audio/vnd.dts.hd": {
      source: "iana",
      extensions: ["dtshd"]
    },
    "audio/vnd.dts.uhd": {
      source: "iana"
    },
    "audio/vnd.dvb.file": {
      source: "iana"
    },
    "audio/vnd.everad.plj": {
      source: "iana"
    },
    "audio/vnd.hns.audio": {
      source: "iana"
    },
    "audio/vnd.lucent.voice": {
      source: "iana",
      extensions: ["lvp"]
    },
    "audio/vnd.ms-playready.media.pya": {
      source: "iana",
      extensions: ["pya"]
    },
    "audio/vnd.nokia.mobile-xmf": {
      source: "iana"
    },
    "audio/vnd.nortel.vbk": {
      source: "iana"
    },
    "audio/vnd.nuera.ecelp4800": {
      source: "iana",
      extensions: ["ecelp4800"]
    },
    "audio/vnd.nuera.ecelp7470": {
      source: "iana",
      extensions: ["ecelp7470"]
    },
    "audio/vnd.nuera.ecelp9600": {
      source: "iana",
      extensions: ["ecelp9600"]
    },
    "audio/vnd.octel.sbc": {
      source: "iana"
    },
    "audio/vnd.presonus.multitrack": {
      source: "iana"
    },
    "audio/vnd.qcelp": {
      source: "iana"
    },
    "audio/vnd.rhetorex.32kadpcm": {
      source: "iana"
    },
    "audio/vnd.rip": {
      source: "iana",
      extensions: ["rip"]
    },
    "audio/vnd.rn-realaudio": {
      compressible: false
    },
    "audio/vnd.sealedmedia.softseal.mpeg": {
      source: "iana"
    },
    "audio/vnd.vmx.cvsd": {
      source: "iana"
    },
    "audio/vnd.wave": {
      compressible: false
    },
    "audio/vorbis": {
      source: "iana",
      compressible: false
    },
    "audio/vorbis-config": {
      source: "iana"
    },
    "audio/wav": {
      compressible: false,
      extensions: ["wav"]
    },
    "audio/wave": {
      compressible: false,
      extensions: ["wav"]
    },
    "audio/webm": {
      source: "apache",
      compressible: false,
      extensions: ["weba"]
    },
    "audio/x-aac": {
      source: "apache",
      compressible: false,
      extensions: ["aac"]
    },
    "audio/x-aiff": {
      source: "apache",
      extensions: ["aif", "aiff", "aifc"]
    },
    "audio/x-caf": {
      source: "apache",
      compressible: false,
      extensions: ["caf"]
    },
    "audio/x-flac": {
      source: "apache",
      extensions: ["flac"]
    },
    "audio/x-m4a": {
      source: "nginx",
      extensions: ["m4a"]
    },
    "audio/x-matroska": {
      source: "apache",
      extensions: ["mka"]
    },
    "audio/x-mpegurl": {
      source: "apache",
      extensions: ["m3u"]
    },
    "audio/x-ms-wax": {
      source: "apache",
      extensions: ["wax"]
    },
    "audio/x-ms-wma": {
      source: "apache",
      extensions: ["wma"]
    },
    "audio/x-pn-realaudio": {
      source: "apache",
      extensions: ["ram", "ra"]
    },
    "audio/x-pn-realaudio-plugin": {
      source: "apache",
      extensions: ["rmp"]
    },
    "audio/x-realaudio": {
      source: "nginx",
      extensions: ["ra"]
    },
    "audio/x-tta": {
      source: "apache"
    },
    "audio/x-wav": {
      source: "apache",
      extensions: ["wav"]
    },
    "audio/xm": {
      source: "apache",
      extensions: ["xm"]
    },
    "chemical/x-cdx": {
      source: "apache",
      extensions: ["cdx"]
    },
    "chemical/x-cif": {
      source: "apache",
      extensions: ["cif"]
    },
    "chemical/x-cmdf": {
      source: "apache",
      extensions: ["cmdf"]
    },
    "chemical/x-cml": {
      source: "apache",
      extensions: ["cml"]
    },
    "chemical/x-csml": {
      source: "apache",
      extensions: ["csml"]
    },
    "chemical/x-pdb": {
      source: "apache"
    },
    "chemical/x-xyz": {
      source: "apache",
      extensions: ["xyz"]
    },
    "font/collection": {
      source: "iana",
      extensions: ["ttc"]
    },
    "font/otf": {
      source: "iana",
      compressible: true,
      extensions: ["otf"]
    },
    "font/sfnt": {
      source: "iana"
    },
    "font/ttf": {
      source: "iana",
      compressible: true,
      extensions: ["ttf"]
    },
    "font/woff": {
      source: "iana",
      extensions: ["woff"]
    },
    "font/woff2": {
      source: "iana",
      extensions: ["woff2"]
    },
    "image/aces": {
      source: "iana",
      extensions: ["exr"]
    },
    "image/apng": {
      compressible: false,
      extensions: ["apng"]
    },
    "image/avci": {
      source: "iana",
      extensions: ["avci"]
    },
    "image/avcs": {
      source: "iana",
      extensions: ["avcs"]
    },
    "image/avif": {
      source: "iana",
      compressible: false,
      extensions: ["avif"]
    },
    "image/bmp": {
      source: "iana",
      compressible: true,
      extensions: ["bmp"]
    },
    "image/cgm": {
      source: "iana",
      extensions: ["cgm"]
    },
    "image/dicom-rle": {
      source: "iana",
      extensions: ["drle"]
    },
    "image/emf": {
      source: "iana",
      extensions: ["emf"]
    },
    "image/fits": {
      source: "iana",
      extensions: ["fits"]
    },
    "image/g3fax": {
      source: "iana",
      extensions: ["g3"]
    },
    "image/gif": {
      source: "iana",
      compressible: false,
      extensions: ["gif"]
    },
    "image/heic": {
      source: "iana",
      extensions: ["heic"]
    },
    "image/heic-sequence": {
      source: "iana",
      extensions: ["heics"]
    },
    "image/heif": {
      source: "iana",
      extensions: ["heif"]
    },
    "image/heif-sequence": {
      source: "iana",
      extensions: ["heifs"]
    },
    "image/hej2k": {
      source: "iana",
      extensions: ["hej2"]
    },
    "image/hsj2": {
      source: "iana",
      extensions: ["hsj2"]
    },
    "image/ief": {
      source: "iana",
      extensions: ["ief"]
    },
    "image/jls": {
      source: "iana",
      extensions: ["jls"]
    },
    "image/jp2": {
      source: "iana",
      compressible: false,
      extensions: ["jp2", "jpg2"]
    },
    "image/jpeg": {
      source: "iana",
      compressible: false,
      extensions: ["jpeg", "jpg", "jpe"]
    },
    "image/jph": {
      source: "iana",
      extensions: ["jph"]
    },
    "image/jphc": {
      source: "iana",
      extensions: ["jhc"]
    },
    "image/jpm": {
      source: "iana",
      compressible: false,
      extensions: ["jpm"]
    },
    "image/jpx": {
      source: "iana",
      compressible: false,
      extensions: ["jpx", "jpf"]
    },
    "image/jxr": {
      source: "iana",
      extensions: ["jxr"]
    },
    "image/jxra": {
      source: "iana",
      extensions: ["jxra"]
    },
    "image/jxrs": {
      source: "iana",
      extensions: ["jxrs"]
    },
    "image/jxs": {
      source: "iana",
      extensions: ["jxs"]
    },
    "image/jxsc": {
      source: "iana",
      extensions: ["jxsc"]
    },
    "image/jxsi": {
      source: "iana",
      extensions: ["jxsi"]
    },
    "image/jxss": {
      source: "iana",
      extensions: ["jxss"]
    },
    "image/ktx": {
      source: "iana",
      extensions: ["ktx"]
    },
    "image/ktx2": {
      source: "iana",
      extensions: ["ktx2"]
    },
    "image/naplps": {
      source: "iana"
    },
    "image/pjpeg": {
      compressible: false
    },
    "image/png": {
      source: "iana",
      compressible: false,
      extensions: ["png"]
    },
    "image/prs.btif": {
      source: "iana",
      extensions: ["btif"]
    },
    "image/prs.pti": {
      source: "iana",
      extensions: ["pti"]
    },
    "image/pwg-raster": {
      source: "iana"
    },
    "image/sgi": {
      source: "apache",
      extensions: ["sgi"]
    },
    "image/svg+xml": {
      source: "iana",
      compressible: true,
      extensions: ["svg", "svgz"]
    },
    "image/t38": {
      source: "iana",
      extensions: ["t38"]
    },
    "image/tiff": {
      source: "iana",
      compressible: false,
      extensions: ["tif", "tiff"]
    },
    "image/tiff-fx": {
      source: "iana",
      extensions: ["tfx"]
    },
    "image/vnd.adobe.photoshop": {
      source: "iana",
      compressible: true,
      extensions: ["psd"]
    },
    "image/vnd.airzip.accelerator.azv": {
      source: "iana",
      extensions: ["azv"]
    },
    "image/vnd.cns.inf2": {
      source: "iana"
    },
    "image/vnd.dece.graphic": {
      source: "iana",
      extensions: ["uvi", "uvvi", "uvg", "uvvg"]
    },
    "image/vnd.djvu": {
      source: "iana",
      extensions: ["djvu", "djv"]
    },
    "image/vnd.dvb.subtitle": {
      source: "iana",
      extensions: ["sub"]
    },
    "image/vnd.dwg": {
      source: "iana",
      extensions: ["dwg"]
    },
    "image/vnd.dxf": {
      source: "iana",
      extensions: ["dxf"]
    },
    "image/vnd.fastbidsheet": {
      source: "iana",
      extensions: ["fbs"]
    },
    "image/vnd.fpx": {
      source: "iana",
      extensions: ["fpx"]
    },
    "image/vnd.fst": {
      source: "iana",
      extensions: ["fst"]
    },
    "image/vnd.fujixerox.edmics-mmr": {
      source: "iana",
      extensions: ["mmr"]
    },
    "image/vnd.fujixerox.edmics-rlc": {
      source: "iana",
      extensions: ["rlc"]
    },
    "image/vnd.globalgraphics.pgb": {
      source: "iana"
    },
    "image/vnd.microsoft.icon": {
      source: "iana",
      compressible: true,
      extensions: ["ico"]
    },
    "image/vnd.mix": {
      source: "iana"
    },
    "image/vnd.mozilla.apng": {
      source: "iana"
    },
    "image/vnd.ms-dds": {
      compressible: true,
      extensions: ["dds"]
    },
    "image/vnd.ms-modi": {
      source: "iana",
      extensions: ["mdi"]
    },
    "image/vnd.ms-photo": {
      source: "apache",
      extensions: ["wdp"]
    },
    "image/vnd.net-fpx": {
      source: "iana",
      extensions: ["npx"]
    },
    "image/vnd.pco.b16": {
      source: "iana",
      extensions: ["b16"]
    },
    "image/vnd.radiance": {
      source: "iana"
    },
    "image/vnd.sealed.png": {
      source: "iana"
    },
    "image/vnd.sealedmedia.softseal.gif": {
      source: "iana"
    },
    "image/vnd.sealedmedia.softseal.jpg": {
      source: "iana"
    },
    "image/vnd.svf": {
      source: "iana"
    },
    "image/vnd.tencent.tap": {
      source: "iana",
      extensions: ["tap"]
    },
    "image/vnd.valve.source.texture": {
      source: "iana",
      extensions: ["vtf"]
    },
    "image/vnd.wap.wbmp": {
      source: "iana",
      extensions: ["wbmp"]
    },
    "image/vnd.xiff": {
      source: "iana",
      extensions: ["xif"]
    },
    "image/vnd.zbrush.pcx": {
      source: "iana",
      extensions: ["pcx"]
    },
    "image/webp": {
      source: "apache",
      extensions: ["webp"]
    },
    "image/wmf": {
      source: "iana",
      extensions: ["wmf"]
    },
    "image/x-3ds": {
      source: "apache",
      extensions: ["3ds"]
    },
    "image/x-cmu-raster": {
      source: "apache",
      extensions: ["ras"]
    },
    "image/x-cmx": {
      source: "apache",
      extensions: ["cmx"]
    },
    "image/x-freehand": {
      source: "apache",
      extensions: ["fh", "fhc", "fh4", "fh5", "fh7"]
    },
    "image/x-icon": {
      source: "apache",
      compressible: true,
      extensions: ["ico"]
    },
    "image/x-jng": {
      source: "nginx",
      extensions: ["jng"]
    },
    "image/x-mrsid-image": {
      source: "apache",
      extensions: ["sid"]
    },
    "image/x-ms-bmp": {
      source: "nginx",
      compressible: true,
      extensions: ["bmp"]
    },
    "image/x-pcx": {
      source: "apache",
      extensions: ["pcx"]
    },
    "image/x-pict": {
      source: "apache",
      extensions: ["pic", "pct"]
    },
    "image/x-portable-anymap": {
      source: "apache",
      extensions: ["pnm"]
    },
    "image/x-portable-bitmap": {
      source: "apache",
      extensions: ["pbm"]
    },
    "image/x-portable-graymap": {
      source: "apache",
      extensions: ["pgm"]
    },
    "image/x-portable-pixmap": {
      source: "apache",
      extensions: ["ppm"]
    },
    "image/x-rgb": {
      source: "apache",
      extensions: ["rgb"]
    },
    "image/x-tga": {
      source: "apache",
      extensions: ["tga"]
    },
    "image/x-xbitmap": {
      source: "apache",
      extensions: ["xbm"]
    },
    "image/x-xcf": {
      compressible: false
    },
    "image/x-xpixmap": {
      source: "apache",
      extensions: ["xpm"]
    },
    "image/x-xwindowdump": {
      source: "apache",
      extensions: ["xwd"]
    },
    "message/cpim": {
      source: "iana"
    },
    "message/delivery-status": {
      source: "iana"
    },
    "message/disposition-notification": {
      source: "iana",
      extensions: [
        "disposition-notification"
      ]
    },
    "message/external-body": {
      source: "iana"
    },
    "message/feedback-report": {
      source: "iana"
    },
    "message/global": {
      source: "iana",
      extensions: ["u8msg"]
    },
    "message/global-delivery-status": {
      source: "iana",
      extensions: ["u8dsn"]
    },
    "message/global-disposition-notification": {
      source: "iana",
      extensions: ["u8mdn"]
    },
    "message/global-headers": {
      source: "iana",
      extensions: ["u8hdr"]
    },
    "message/http": {
      source: "iana",
      compressible: false
    },
    "message/imdn+xml": {
      source: "iana",
      compressible: true
    },
    "message/news": {
      source: "iana"
    },
    "message/partial": {
      source: "iana",
      compressible: false
    },
    "message/rfc822": {
      source: "iana",
      compressible: true,
      extensions: ["eml", "mime"]
    },
    "message/s-http": {
      source: "iana"
    },
    "message/sip": {
      source: "iana"
    },
    "message/sipfrag": {
      source: "iana"
    },
    "message/tracking-status": {
      source: "iana"
    },
    "message/vnd.si.simp": {
      source: "iana"
    },
    "message/vnd.wfa.wsc": {
      source: "iana",
      extensions: ["wsc"]
    },
    "model/3mf": {
      source: "iana",
      extensions: ["3mf"]
    },
    "model/e57": {
      source: "iana"
    },
    "model/gltf+json": {
      source: "iana",
      compressible: true,
      extensions: ["gltf"]
    },
    "model/gltf-binary": {
      source: "iana",
      compressible: true,
      extensions: ["glb"]
    },
    "model/iges": {
      source: "iana",
      compressible: false,
      extensions: ["igs", "iges"]
    },
    "model/mesh": {
      source: "iana",
      compressible: false,
      extensions: ["msh", "mesh", "silo"]
    },
    "model/mtl": {
      source: "iana",
      extensions: ["mtl"]
    },
    "model/obj": {
      source: "iana",
      extensions: ["obj"]
    },
    "model/step": {
      source: "iana"
    },
    "model/step+xml": {
      source: "iana",
      compressible: true,
      extensions: ["stpx"]
    },
    "model/step+zip": {
      source: "iana",
      compressible: false,
      extensions: ["stpz"]
    },
    "model/step-xml+zip": {
      source: "iana",
      compressible: false,
      extensions: ["stpxz"]
    },
    "model/stl": {
      source: "iana",
      extensions: ["stl"]
    },
    "model/vnd.collada+xml": {
      source: "iana",
      compressible: true,
      extensions: ["dae"]
    },
    "model/vnd.dwf": {
      source: "iana",
      extensions: ["dwf"]
    },
    "model/vnd.flatland.3dml": {
      source: "iana"
    },
    "model/vnd.gdl": {
      source: "iana",
      extensions: ["gdl"]
    },
    "model/vnd.gs-gdl": {
      source: "apache"
    },
    "model/vnd.gs.gdl": {
      source: "iana"
    },
    "model/vnd.gtw": {
      source: "iana",
      extensions: ["gtw"]
    },
    "model/vnd.moml+xml": {
      source: "iana",
      compressible: true
    },
    "model/vnd.mts": {
      source: "iana",
      extensions: ["mts"]
    },
    "model/vnd.opengex": {
      source: "iana",
      extensions: ["ogex"]
    },
    "model/vnd.parasolid.transmit.binary": {
      source: "iana",
      extensions: ["x_b"]
    },
    "model/vnd.parasolid.transmit.text": {
      source: "iana",
      extensions: ["x_t"]
    },
    "model/vnd.pytha.pyox": {
      source: "iana"
    },
    "model/vnd.rosette.annotated-data-model": {
      source: "iana"
    },
    "model/vnd.sap.vds": {
      source: "iana",
      extensions: ["vds"]
    },
    "model/vnd.usdz+zip": {
      source: "iana",
      compressible: false,
      extensions: ["usdz"]
    },
    "model/vnd.valve.source.compiled-map": {
      source: "iana",
      extensions: ["bsp"]
    },
    "model/vnd.vtu": {
      source: "iana",
      extensions: ["vtu"]
    },
    "model/vrml": {
      source: "iana",
      compressible: false,
      extensions: ["wrl", "vrml"]
    },
    "model/x3d+binary": {
      source: "apache",
      compressible: false,
      extensions: ["x3db", "x3dbz"]
    },
    "model/x3d+fastinfoset": {
      source: "iana",
      extensions: ["x3db"]
    },
    "model/x3d+vrml": {
      source: "apache",
      compressible: false,
      extensions: ["x3dv", "x3dvz"]
    },
    "model/x3d+xml": {
      source: "iana",
      compressible: true,
      extensions: ["x3d", "x3dz"]
    },
    "model/x3d-vrml": {
      source: "iana",
      extensions: ["x3dv"]
    },
    "multipart/alternative": {
      source: "iana",
      compressible: false
    },
    "multipart/appledouble": {
      source: "iana"
    },
    "multipart/byteranges": {
      source: "iana"
    },
    "multipart/digest": {
      source: "iana"
    },
    "multipart/encrypted": {
      source: "iana",
      compressible: false
    },
    "multipart/form-data": {
      source: "iana",
      compressible: false
    },
    "multipart/header-set": {
      source: "iana"
    },
    "multipart/mixed": {
      source: "iana"
    },
    "multipart/multilingual": {
      source: "iana"
    },
    "multipart/parallel": {
      source: "iana"
    },
    "multipart/related": {
      source: "iana",
      compressible: false
    },
    "multipart/report": {
      source: "iana"
    },
    "multipart/signed": {
      source: "iana",
      compressible: false
    },
    "multipart/vnd.bint.med-plus": {
      source: "iana"
    },
    "multipart/voice-message": {
      source: "iana"
    },
    "multipart/x-mixed-replace": {
      source: "iana"
    },
    "text/1d-interleaved-parityfec": {
      source: "iana"
    },
    "text/cache-manifest": {
      source: "iana",
      compressible: true,
      extensions: ["appcache", "manifest"]
    },
    "text/calendar": {
      source: "iana",
      extensions: ["ics", "ifb"]
    },
    "text/calender": {
      compressible: true
    },
    "text/cmd": {
      compressible: true
    },
    "text/coffeescript": {
      extensions: ["coffee", "litcoffee"]
    },
    "text/cql": {
      source: "iana"
    },
    "text/cql-expression": {
      source: "iana"
    },
    "text/cql-identifier": {
      source: "iana"
    },
    "text/css": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["css"]
    },
    "text/csv": {
      source: "iana",
      compressible: true,
      extensions: ["csv"]
    },
    "text/csv-schema": {
      source: "iana"
    },
    "text/directory": {
      source: "iana"
    },
    "text/dns": {
      source: "iana"
    },
    "text/ecmascript": {
      source: "iana"
    },
    "text/encaprtp": {
      source: "iana"
    },
    "text/enriched": {
      source: "iana"
    },
    "text/fhirpath": {
      source: "iana"
    },
    "text/flexfec": {
      source: "iana"
    },
    "text/fwdred": {
      source: "iana"
    },
    "text/gff3": {
      source: "iana"
    },
    "text/grammar-ref-list": {
      source: "iana"
    },
    "text/html": {
      source: "iana",
      compressible: true,
      extensions: ["html", "htm", "shtml"]
    },
    "text/jade": {
      extensions: ["jade"]
    },
    "text/javascript": {
      source: "iana",
      compressible: true
    },
    "text/jcr-cnd": {
      source: "iana"
    },
    "text/jsx": {
      compressible: true,
      extensions: ["jsx"]
    },
    "text/less": {
      compressible: true,
      extensions: ["less"]
    },
    "text/markdown": {
      source: "iana",
      compressible: true,
      extensions: ["markdown", "md"]
    },
    "text/mathml": {
      source: "nginx",
      extensions: ["mml"]
    },
    "text/mdx": {
      compressible: true,
      extensions: ["mdx"]
    },
    "text/mizar": {
      source: "iana"
    },
    "text/n3": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["n3"]
    },
    "text/parameters": {
      source: "iana",
      charset: "UTF-8"
    },
    "text/parityfec": {
      source: "iana"
    },
    "text/plain": {
      source: "iana",
      compressible: true,
      extensions: ["txt", "text", "conf", "def", "list", "log", "in", "ini"]
    },
    "text/provenance-notation": {
      source: "iana",
      charset: "UTF-8"
    },
    "text/prs.fallenstein.rst": {
      source: "iana"
    },
    "text/prs.lines.tag": {
      source: "iana",
      extensions: ["dsc"]
    },
    "text/prs.prop.logic": {
      source: "iana"
    },
    "text/raptorfec": {
      source: "iana"
    },
    "text/red": {
      source: "iana"
    },
    "text/rfc822-headers": {
      source: "iana"
    },
    "text/richtext": {
      source: "iana",
      compressible: true,
      extensions: ["rtx"]
    },
    "text/rtf": {
      source: "iana",
      compressible: true,
      extensions: ["rtf"]
    },
    "text/rtp-enc-aescm128": {
      source: "iana"
    },
    "text/rtploopback": {
      source: "iana"
    },
    "text/rtx": {
      source: "iana"
    },
    "text/sgml": {
      source: "iana",
      extensions: ["sgml", "sgm"]
    },
    "text/shaclc": {
      source: "iana"
    },
    "text/shex": {
      source: "iana",
      extensions: ["shex"]
    },
    "text/slim": {
      extensions: ["slim", "slm"]
    },
    "text/spdx": {
      source: "iana",
      extensions: ["spdx"]
    },
    "text/strings": {
      source: "iana"
    },
    "text/stylus": {
      extensions: ["stylus", "styl"]
    },
    "text/t140": {
      source: "iana"
    },
    "text/tab-separated-values": {
      source: "iana",
      compressible: true,
      extensions: ["tsv"]
    },
    "text/troff": {
      source: "iana",
      extensions: ["t", "tr", "roff", "man", "me", "ms"]
    },
    "text/turtle": {
      source: "iana",
      charset: "UTF-8",
      extensions: ["ttl"]
    },
    "text/ulpfec": {
      source: "iana"
    },
    "text/uri-list": {
      source: "iana",
      compressible: true,
      extensions: ["uri", "uris", "urls"]
    },
    "text/vcard": {
      source: "iana",
      compressible: true,
      extensions: ["vcard"]
    },
    "text/vnd.a": {
      source: "iana"
    },
    "text/vnd.abc": {
      source: "iana"
    },
    "text/vnd.ascii-art": {
      source: "iana"
    },
    "text/vnd.curl": {
      source: "iana",
      extensions: ["curl"]
    },
    "text/vnd.curl.dcurl": {
      source: "apache",
      extensions: ["dcurl"]
    },
    "text/vnd.curl.mcurl": {
      source: "apache",
      extensions: ["mcurl"]
    },
    "text/vnd.curl.scurl": {
      source: "apache",
      extensions: ["scurl"]
    },
    "text/vnd.debian.copyright": {
      source: "iana",
      charset: "UTF-8"
    },
    "text/vnd.dmclientscript": {
      source: "iana"
    },
    "text/vnd.dvb.subtitle": {
      source: "iana",
      extensions: ["sub"]
    },
    "text/vnd.esmertec.theme-descriptor": {
      source: "iana",
      charset: "UTF-8"
    },
    "text/vnd.familysearch.gedcom": {
      source: "iana",
      extensions: ["ged"]
    },
    "text/vnd.ficlab.flt": {
      source: "iana"
    },
    "text/vnd.fly": {
      source: "iana",
      extensions: ["fly"]
    },
    "text/vnd.fmi.flexstor": {
      source: "iana",
      extensions: ["flx"]
    },
    "text/vnd.gml": {
      source: "iana"
    },
    "text/vnd.graphviz": {
      source: "iana",
      extensions: ["gv"]
    },
    "text/vnd.hans": {
      source: "iana"
    },
    "text/vnd.hgl": {
      source: "iana"
    },
    "text/vnd.in3d.3dml": {
      source: "iana",
      extensions: ["3dml"]
    },
    "text/vnd.in3d.spot": {
      source: "iana",
      extensions: ["spot"]
    },
    "text/vnd.iptc.newsml": {
      source: "iana"
    },
    "text/vnd.iptc.nitf": {
      source: "iana"
    },
    "text/vnd.latex-z": {
      source: "iana"
    },
    "text/vnd.motorola.reflex": {
      source: "iana"
    },
    "text/vnd.ms-mediapackage": {
      source: "iana"
    },
    "text/vnd.net2phone.commcenter.command": {
      source: "iana"
    },
    "text/vnd.radisys.msml-basic-layout": {
      source: "iana"
    },
    "text/vnd.senx.warpscript": {
      source: "iana"
    },
    "text/vnd.si.uricatalogue": {
      source: "iana"
    },
    "text/vnd.sosi": {
      source: "iana"
    },
    "text/vnd.sun.j2me.app-descriptor": {
      source: "iana",
      charset: "UTF-8",
      extensions: ["jad"]
    },
    "text/vnd.trolltech.linguist": {
      source: "iana",
      charset: "UTF-8"
    },
    "text/vnd.wap.si": {
      source: "iana"
    },
    "text/vnd.wap.sl": {
      source: "iana"
    },
    "text/vnd.wap.wml": {
      source: "iana",
      extensions: ["wml"]
    },
    "text/vnd.wap.wmlscript": {
      source: "iana",
      extensions: ["wmls"]
    },
    "text/vtt": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["vtt"]
    },
    "text/x-asm": {
      source: "apache",
      extensions: ["s", "asm"]
    },
    "text/x-c": {
      source: "apache",
      extensions: ["c", "cc", "cxx", "cpp", "h", "hh", "dic"]
    },
    "text/x-component": {
      source: "nginx",
      extensions: ["htc"]
    },
    "text/x-fortran": {
      source: "apache",
      extensions: ["f", "for", "f77", "f90"]
    },
    "text/x-gwt-rpc": {
      compressible: true
    },
    "text/x-handlebars-template": {
      extensions: ["hbs"]
    },
    "text/x-java-source": {
      source: "apache",
      extensions: ["java"]
    },
    "text/x-jquery-tmpl": {
      compressible: true
    },
    "text/x-lua": {
      extensions: ["lua"]
    },
    "text/x-markdown": {
      compressible: true,
      extensions: ["mkd"]
    },
    "text/x-nfo": {
      source: "apache",
      extensions: ["nfo"]
    },
    "text/x-opml": {
      source: "apache",
      extensions: ["opml"]
    },
    "text/x-org": {
      compressible: true,
      extensions: ["org"]
    },
    "text/x-pascal": {
      source: "apache",
      extensions: ["p", "pas"]
    },
    "text/x-processing": {
      compressible: true,
      extensions: ["pde"]
    },
    "text/x-sass": {
      extensions: ["sass"]
    },
    "text/x-scss": {
      extensions: ["scss"]
    },
    "text/x-setext": {
      source: "apache",
      extensions: ["etx"]
    },
    "text/x-sfv": {
      source: "apache",
      extensions: ["sfv"]
    },
    "text/x-suse-ymp": {
      compressible: true,
      extensions: ["ymp"]
    },
    "text/x-uuencode": {
      source: "apache",
      extensions: ["uu"]
    },
    "text/x-vcalendar": {
      source: "apache",
      extensions: ["vcs"]
    },
    "text/x-vcard": {
      source: "apache",
      extensions: ["vcf"]
    },
    "text/xml": {
      source: "iana",
      compressible: true,
      extensions: ["xml"]
    },
    "text/xml-external-parsed-entity": {
      source: "iana"
    },
    "text/yaml": {
      compressible: true,
      extensions: ["yaml", "yml"]
    },
    "video/1d-interleaved-parityfec": {
      source: "iana"
    },
    "video/3gpp": {
      source: "iana",
      extensions: ["3gp", "3gpp"]
    },
    "video/3gpp-tt": {
      source: "iana"
    },
    "video/3gpp2": {
      source: "iana",
      extensions: ["3g2"]
    },
    "video/av1": {
      source: "iana"
    },
    "video/bmpeg": {
      source: "iana"
    },
    "video/bt656": {
      source: "iana"
    },
    "video/celb": {
      source: "iana"
    },
    "video/dv": {
      source: "iana"
    },
    "video/encaprtp": {
      source: "iana"
    },
    "video/ffv1": {
      source: "iana"
    },
    "video/flexfec": {
      source: "iana"
    },
    "video/h261": {
      source: "iana",
      extensions: ["h261"]
    },
    "video/h263": {
      source: "iana",
      extensions: ["h263"]
    },
    "video/h263-1998": {
      source: "iana"
    },
    "video/h263-2000": {
      source: "iana"
    },
    "video/h264": {
      source: "iana",
      extensions: ["h264"]
    },
    "video/h264-rcdo": {
      source: "iana"
    },
    "video/h264-svc": {
      source: "iana"
    },
    "video/h265": {
      source: "iana"
    },
    "video/iso.segment": {
      source: "iana",
      extensions: ["m4s"]
    },
    "video/jpeg": {
      source: "iana",
      extensions: ["jpgv"]
    },
    "video/jpeg2000": {
      source: "iana"
    },
    "video/jpm": {
      source: "apache",
      extensions: ["jpm", "jpgm"]
    },
    "video/jxsv": {
      source: "iana"
    },
    "video/mj2": {
      source: "iana",
      extensions: ["mj2", "mjp2"]
    },
    "video/mp1s": {
      source: "iana"
    },
    "video/mp2p": {
      source: "iana"
    },
    "video/mp2t": {
      source: "iana",
      extensions: ["ts"]
    },
    "video/mp4": {
      source: "iana",
      compressible: false,
      extensions: ["mp4", "mp4v", "mpg4"]
    },
    "video/mp4v-es": {
      source: "iana"
    },
    "video/mpeg": {
      source: "iana",
      compressible: false,
      extensions: ["mpeg", "mpg", "mpe", "m1v", "m2v"]
    },
    "video/mpeg4-generic": {
      source: "iana"
    },
    "video/mpv": {
      source: "iana"
    },
    "video/nv": {
      source: "iana"
    },
    "video/ogg": {
      source: "iana",
      compressible: false,
      extensions: ["ogv"]
    },
    "video/parityfec": {
      source: "iana"
    },
    "video/pointer": {
      source: "iana"
    },
    "video/quicktime": {
      source: "iana",
      compressible: false,
      extensions: ["qt", "mov"]
    },
    "video/raptorfec": {
      source: "iana"
    },
    "video/raw": {
      source: "iana"
    },
    "video/rtp-enc-aescm128": {
      source: "iana"
    },
    "video/rtploopback": {
      source: "iana"
    },
    "video/rtx": {
      source: "iana"
    },
    "video/scip": {
      source: "iana"
    },
    "video/smpte291": {
      source: "iana"
    },
    "video/smpte292m": {
      source: "iana"
    },
    "video/ulpfec": {
      source: "iana"
    },
    "video/vc1": {
      source: "iana"
    },
    "video/vc2": {
      source: "iana"
    },
    "video/vnd.cctv": {
      source: "iana"
    },
    "video/vnd.dece.hd": {
      source: "iana",
      extensions: ["uvh", "uvvh"]
    },
    "video/vnd.dece.mobile": {
      source: "iana",
      extensions: ["uvm", "uvvm"]
    },
    "video/vnd.dece.mp4": {
      source: "iana"
    },
    "video/vnd.dece.pd": {
      source: "iana",
      extensions: ["uvp", "uvvp"]
    },
    "video/vnd.dece.sd": {
      source: "iana",
      extensions: ["uvs", "uvvs"]
    },
    "video/vnd.dece.video": {
      source: "iana",
      extensions: ["uvv", "uvvv"]
    },
    "video/vnd.directv.mpeg": {
      source: "iana"
    },
    "video/vnd.directv.mpeg-tts": {
      source: "iana"
    },
    "video/vnd.dlna.mpeg-tts": {
      source: "iana"
    },
    "video/vnd.dvb.file": {
      source: "iana",
      extensions: ["dvb"]
    },
    "video/vnd.fvt": {
      source: "iana",
      extensions: ["fvt"]
    },
    "video/vnd.hns.video": {
      source: "iana"
    },
    "video/vnd.iptvforum.1dparityfec-1010": {
      source: "iana"
    },
    "video/vnd.iptvforum.1dparityfec-2005": {
      source: "iana"
    },
    "video/vnd.iptvforum.2dparityfec-1010": {
      source: "iana"
    },
    "video/vnd.iptvforum.2dparityfec-2005": {
      source: "iana"
    },
    "video/vnd.iptvforum.ttsavc": {
      source: "iana"
    },
    "video/vnd.iptvforum.ttsmpeg2": {
      source: "iana"
    },
    "video/vnd.motorola.video": {
      source: "iana"
    },
    "video/vnd.motorola.videop": {
      source: "iana"
    },
    "video/vnd.mpegurl": {
      source: "iana",
      extensions: ["mxu", "m4u"]
    },
    "video/vnd.ms-playready.media.pyv": {
      source: "iana",
      extensions: ["pyv"]
    },
    "video/vnd.nokia.interleaved-multimedia": {
      source: "iana"
    },
    "video/vnd.nokia.mp4vr": {
      source: "iana"
    },
    "video/vnd.nokia.videovoip": {
      source: "iana"
    },
    "video/vnd.objectvideo": {
      source: "iana"
    },
    "video/vnd.radgamettools.bink": {
      source: "iana"
    },
    "video/vnd.radgamettools.smacker": {
      source: "iana"
    },
    "video/vnd.sealed.mpeg1": {
      source: "iana"
    },
    "video/vnd.sealed.mpeg4": {
      source: "iana"
    },
    "video/vnd.sealed.swf": {
      source: "iana"
    },
    "video/vnd.sealedmedia.softseal.mov": {
      source: "iana"
    },
    "video/vnd.uvvu.mp4": {
      source: "iana",
      extensions: ["uvu", "uvvu"]
    },
    "video/vnd.vivo": {
      source: "iana",
      extensions: ["viv"]
    },
    "video/vnd.youtube.yt": {
      source: "iana"
    },
    "video/vp8": {
      source: "iana"
    },
    "video/vp9": {
      source: "iana"
    },
    "video/webm": {
      source: "apache",
      compressible: false,
      extensions: ["webm"]
    },
    "video/x-f4v": {
      source: "apache",
      extensions: ["f4v"]
    },
    "video/x-fli": {
      source: "apache",
      extensions: ["fli"]
    },
    "video/x-flv": {
      source: "apache",
      compressible: false,
      extensions: ["flv"]
    },
    "video/x-m4v": {
      source: "apache",
      extensions: ["m4v"]
    },
    "video/x-matroska": {
      source: "apache",
      compressible: false,
      extensions: ["mkv", "mk3d", "mks"]
    },
    "video/x-mng": {
      source: "apache",
      extensions: ["mng"]
    },
    "video/x-ms-asf": {
      source: "apache",
      extensions: ["asf", "asx"]
    },
    "video/x-ms-vob": {
      source: "apache",
      extensions: ["vob"]
    },
    "video/x-ms-wm": {
      source: "apache",
      extensions: ["wm"]
    },
    "video/x-ms-wmv": {
      source: "apache",
      compressible: false,
      extensions: ["wmv"]
    },
    "video/x-ms-wmx": {
      source: "apache",
      extensions: ["wmx"]
    },
    "video/x-ms-wvx": {
      source: "apache",
      extensions: ["wvx"]
    },
    "video/x-msvideo": {
      source: "apache",
      extensions: ["avi"]
    },
    "video/x-sgi-movie": {
      source: "apache",
      extensions: ["movie"]
    },
    "video/x-smv": {
      source: "apache",
      extensions: ["smv"]
    },
    "x-conference/x-cooltalk": {
      source: "apache",
      extensions: ["ice"]
    },
    "x-shader/x-fragment": {
      compressible: true
    },
    "x-shader/x-vertex": {
      compressible: true
    }
  };
});

// node_modules/mime-types/index.js
var require_mime_types = __commonJS((exports) => {
  /*!
   * mime-types
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   */
  var db = require_db();
  var extname = __require("path").extname;
  var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
  var TEXT_TYPE_REGEXP = /^text\//i;
  exports.charset = charset;
  exports.charsets = { lookup: charset };
  exports.contentType = contentType;
  exports.extension = extension;
  exports.extensions = Object.create(null);
  exports.lookup = lookup;
  exports.types = Object.create(null);
  populateMaps(exports.extensions, exports.types);
  function charset(type) {
    if (!type || typeof type !== "string") {
      return false;
    }
    var match = EXTRACT_TYPE_REGEXP.exec(type);
    var mime = match && db[match[1].toLowerCase()];
    if (mime && mime.charset) {
      return mime.charset;
    }
    if (match && TEXT_TYPE_REGEXP.test(match[1])) {
      return "UTF-8";
    }
    return false;
  }
  function contentType(str) {
    if (!str || typeof str !== "string") {
      return false;
    }
    var mime = str.indexOf("/") === -1 ? exports.lookup(str) : str;
    if (!mime) {
      return false;
    }
    if (mime.indexOf("charset") === -1) {
      var charset2 = exports.charset(mime);
      if (charset2)
        mime += "; charset=" + charset2.toLowerCase();
    }
    return mime;
  }
  function extension(type) {
    if (!type || typeof type !== "string") {
      return false;
    }
    var match = EXTRACT_TYPE_REGEXP.exec(type);
    var exts = match && exports.extensions[match[1].toLowerCase()];
    if (!exts || !exts.length) {
      return false;
    }
    return exts[0];
  }
  function lookup(path) {
    if (!path || typeof path !== "string") {
      return false;
    }
    var extension2 = extname("x." + path).toLowerCase().substr(1);
    if (!extension2) {
      return false;
    }
    return exports.types[extension2] || false;
  }
  function populateMaps(extensions, types) {
    var preference = ["nginx", "apache", undefined, "iana"];
    Object.keys(db).forEach(function forEachMimeType(type) {
      var mime = db[type];
      var exts = mime.extensions;
      if (!exts || !exts.length) {
        return;
      }
      extensions[type] = exts;
      for (var i = 0;i < exts.length; i++) {
        var extension2 = exts[i];
        if (types[extension2]) {
          var from = preference.indexOf(db[types[extension2]].source);
          var to = preference.indexOf(mime.source);
          if (types[extension2] !== "application/octet-stream" && (from > to || from === to && types[extension2].substr(0, 12) === "application/")) {
            continue;
          }
        }
        types[extension2] = type;
      }
    });
  }
});

// node_modules/asynckit/lib/defer.js
var require_defer = __commonJS((exports, module) => {
  module.exports = defer;
  function defer(fn) {
    var nextTick = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
    if (nextTick) {
      nextTick(fn);
    } else {
      setTimeout(fn, 0);
    }
  }
});

// node_modules/asynckit/lib/async.js
var require_async = __commonJS((exports, module) => {
  var defer = require_defer();
  module.exports = async;
  function async(callback) {
    var isAsync = false;
    defer(function() {
      isAsync = true;
    });
    return function async_callback(err, result) {
      if (isAsync) {
        callback(err, result);
      } else {
        defer(function nextTick_callback() {
          callback(err, result);
        });
      }
    };
  }
});

// node_modules/asynckit/lib/abort.js
var require_abort = __commonJS((exports, module) => {
  module.exports = abort;
  function abort(state) {
    Object.keys(state.jobs).forEach(clean.bind(state));
    state.jobs = {};
  }
  function clean(key) {
    if (typeof this.jobs[key] == "function") {
      this.jobs[key]();
    }
  }
});

// node_modules/asynckit/lib/iterate.js
var require_iterate = __commonJS((exports, module) => {
  var async = require_async();
  var abort = require_abort();
  module.exports = iterate;
  function iterate(list, iterator2, state, callback) {
    var key = state["keyedList"] ? state["keyedList"][state.index] : state.index;
    state.jobs[key] = runJob(iterator2, key, list[key], function(error, output) {
      if (!(key in state.jobs)) {
        return;
      }
      delete state.jobs[key];
      if (error) {
        abort(state);
      } else {
        state.results[key] = output;
      }
      callback(error, state.results);
    });
  }
  function runJob(iterator2, key, item, callback) {
    var aborter;
    if (iterator2.length == 2) {
      aborter = iterator2(item, async(callback));
    } else {
      aborter = iterator2(item, key, async(callback));
    }
    return aborter;
  }
});

// node_modules/asynckit/lib/state.js
var require_state = __commonJS((exports, module) => {
  module.exports = state;
  function state(list, sortMethod) {
    var isNamedList = !Array.isArray(list), initState = {
      index: 0,
      keyedList: isNamedList || sortMethod ? Object.keys(list) : null,
      jobs: {},
      results: isNamedList ? {} : [],
      size: isNamedList ? Object.keys(list).length : list.length
    };
    if (sortMethod) {
      initState.keyedList.sort(isNamedList ? sortMethod : function(a, b) {
        return sortMethod(list[a], list[b]);
      });
    }
    return initState;
  }
});

// node_modules/asynckit/lib/terminator.js
var require_terminator = __commonJS((exports, module) => {
  var abort = require_abort();
  var async = require_async();
  module.exports = terminator;
  function terminator(callback) {
    if (!Object.keys(this.jobs).length) {
      return;
    }
    this.index = this.size;
    abort(this);
    async(callback)(null, this.results);
  }
});

// node_modules/asynckit/parallel.js
var require_parallel = __commonJS((exports, module) => {
  var iterate = require_iterate();
  var initState = require_state();
  var terminator = require_terminator();
  module.exports = parallel;
  function parallel(list, iterator2, callback) {
    var state = initState(list);
    while (state.index < (state["keyedList"] || list).length) {
      iterate(list, iterator2, state, function(error, result) {
        if (error) {
          callback(error, result);
          return;
        }
        if (Object.keys(state.jobs).length === 0) {
          callback(null, state.results);
          return;
        }
      });
      state.index++;
    }
    return terminator.bind(state, callback);
  }
});

// node_modules/asynckit/serialOrdered.js
var require_serialOrdered = __commonJS((exports, module) => {
  var iterate = require_iterate();
  var initState = require_state();
  var terminator = require_terminator();
  module.exports = serialOrdered;
  module.exports.ascending = ascending;
  module.exports.descending = descending;
  function serialOrdered(list, iterator2, sortMethod, callback) {
    var state = initState(list, sortMethod);
    iterate(list, iterator2, state, function iteratorHandler(error, result) {
      if (error) {
        callback(error, result);
        return;
      }
      state.index++;
      if (state.index < (state["keyedList"] || list).length) {
        iterate(list, iterator2, state, iteratorHandler);
        return;
      }
      callback(null, state.results);
    });
    return terminator.bind(state, callback);
  }
  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function descending(a, b) {
    return -1 * ascending(a, b);
  }
});

// node_modules/asynckit/serial.js
var require_serial = __commonJS((exports, module) => {
  var serialOrdered = require_serialOrdered();
  module.exports = serial;
  function serial(list, iterator2, callback) {
    return serialOrdered(list, iterator2, null, callback);
  }
});

// node_modules/asynckit/index.js
var require_asynckit = __commonJS((exports, module) => {
  module.exports = {
    parallel: require_parallel(),
    serial: require_serial(),
    serialOrdered: require_serialOrdered()
  };
});

// node_modules/es-object-atoms/index.js
var require_es_object_atoms = __commonJS((exports, module) => {
  module.exports = Object;
});

// node_modules/es-errors/index.js
var require_es_errors = __commonJS((exports, module) => {
  module.exports = Error;
});

// node_modules/es-errors/eval.js
var require_eval = __commonJS((exports, module) => {
  module.exports = EvalError;
});

// node_modules/es-errors/range.js
var require_range = __commonJS((exports, module) => {
  module.exports = RangeError;
});

// node_modules/es-errors/ref.js
var require_ref = __commonJS((exports, module) => {
  module.exports = ReferenceError;
});

// node_modules/es-errors/syntax.js
var require_syntax = __commonJS((exports, module) => {
  module.exports = SyntaxError;
});

// node_modules/es-errors/type.js
var require_type = __commonJS((exports, module) => {
  module.exports = TypeError;
});

// node_modules/es-errors/uri.js
var require_uri = __commonJS((exports, module) => {
  module.exports = URIError;
});

// node_modules/math-intrinsics/abs.js
var require_abs = __commonJS((exports, module) => {
  module.exports = Math.abs;
});

// node_modules/math-intrinsics/floor.js
var require_floor = __commonJS((exports, module) => {
  module.exports = Math.floor;
});

// node_modules/math-intrinsics/max.js
var require_max = __commonJS((exports, module) => {
  module.exports = Math.max;
});

// node_modules/math-intrinsics/min.js
var require_min = __commonJS((exports, module) => {
  module.exports = Math.min;
});

// node_modules/math-intrinsics/pow.js
var require_pow = __commonJS((exports, module) => {
  module.exports = Math.pow;
});

// node_modules/math-intrinsics/round.js
var require_round = __commonJS((exports, module) => {
  module.exports = Math.round;
});

// node_modules/math-intrinsics/isNaN.js
var require_isNaN = __commonJS((exports, module) => {
  module.exports = Number.isNaN || function isNaN2(a) {
    return a !== a;
  };
});

// node_modules/math-intrinsics/sign.js
var require_sign = __commonJS((exports, module) => {
  var $isNaN = require_isNaN();
  module.exports = function sign(number) {
    if ($isNaN(number) || number === 0) {
      return number;
    }
    return number < 0 ? -1 : 1;
  };
});

// node_modules/gopd/gOPD.js
var require_gOPD = __commonJS((exports, module) => {
  module.exports = Object.getOwnPropertyDescriptor;
});

// node_modules/gopd/index.js
var require_gopd = __commonJS((exports, module) => {
  var $gOPD = require_gOPD();
  if ($gOPD) {
    try {
      $gOPD([], "length");
    } catch (e) {
      $gOPD = null;
    }
  }
  module.exports = $gOPD;
});

// node_modules/es-define-property/index.js
var require_es_define_property = __commonJS((exports, module) => {
  var $defineProperty = Object.defineProperty || false;
  if ($defineProperty) {
    try {
      $defineProperty({}, "a", { value: 1 });
    } catch (e) {
      $defineProperty = false;
    }
  }
  module.exports = $defineProperty;
});

// node_modules/has-symbols/shams.js
var require_shams = __commonJS((exports, module) => {
  module.exports = function hasSymbols() {
    if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
      return false;
    }
    if (typeof Symbol.iterator === "symbol") {
      return true;
    }
    var obj = {};
    var sym = Symbol("test");
    var symObj = Object(sym);
    if (typeof sym === "string") {
      return false;
    }
    if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
      return false;
    }
    if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
      return false;
    }
    var symVal = 42;
    obj[sym] = symVal;
    for (var _ in obj) {
      return false;
    }
    if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
      return false;
    }
    if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
      return false;
    }
    var syms = Object.getOwnPropertySymbols(obj);
    if (syms.length !== 1 || syms[0] !== sym) {
      return false;
    }
    if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
      return false;
    }
    if (typeof Object.getOwnPropertyDescriptor === "function") {
      var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
      if (descriptor.value !== symVal || descriptor.enumerable !== true) {
        return false;
      }
    }
    return true;
  };
});

// node_modules/has-symbols/index.js
var require_has_symbols = __commonJS((exports, module) => {
  var origSymbol = typeof Symbol !== "undefined" && Symbol;
  var hasSymbolSham = require_shams();
  module.exports = function hasNativeSymbols() {
    if (typeof origSymbol !== "function") {
      return false;
    }
    if (typeof Symbol !== "function") {
      return false;
    }
    if (typeof origSymbol("foo") !== "symbol") {
      return false;
    }
    if (typeof Symbol("bar") !== "symbol") {
      return false;
    }
    return hasSymbolSham();
  };
});

// node_modules/get-proto/Reflect.getPrototypeOf.js
var require_Reflect_getPrototypeOf = __commonJS((exports, module) => {
  module.exports = typeof Reflect !== "undefined" && Reflect.getPrototypeOf || null;
});

// node_modules/get-proto/Object.getPrototypeOf.js
var require_Object_getPrototypeOf = __commonJS((exports, module) => {
  var $Object = require_es_object_atoms();
  module.exports = $Object.getPrototypeOf || null;
});

// node_modules/function-bind/implementation.js
var require_implementation = __commonJS((exports, module) => {
  var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
  var toStr = Object.prototype.toString;
  var max = Math.max;
  var funcType = "[object Function]";
  var concatty = function concatty2(a, b) {
    var arr = [];
    for (var i = 0;i < a.length; i += 1) {
      arr[i] = a[i];
    }
    for (var j = 0;j < b.length; j += 1) {
      arr[j + a.length] = b[j];
    }
    return arr;
  };
  var slicy = function slicy2(arrLike, offset) {
    var arr = [];
    for (var i = offset || 0, j = 0;i < arrLike.length; i += 1, j += 1) {
      arr[j] = arrLike[i];
    }
    return arr;
  };
  var joiny = function(arr, joiner) {
    var str = "";
    for (var i = 0;i < arr.length; i += 1) {
      str += arr[i];
      if (i + 1 < arr.length) {
        str += joiner;
      }
    }
    return str;
  };
  module.exports = function bind2(that) {
    var target = this;
    if (typeof target !== "function" || toStr.apply(target) !== funcType) {
      throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slicy(arguments, 1);
    var bound;
    var binder = function() {
      if (this instanceof bound) {
        var result = target.apply(this, concatty(args, arguments));
        if (Object(result) === result) {
          return result;
        }
        return this;
      }
      return target.apply(that, concatty(args, arguments));
    };
    var boundLength = max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0;i < boundLength; i++) {
      boundArgs[i] = "$" + i;
    }
    bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
    if (target.prototype) {
      var Empty = function Empty2() {};
      Empty.prototype = target.prototype;
      bound.prototype = new Empty;
      Empty.prototype = null;
    }
    return bound;
  };
});

// node_modules/function-bind/index.js
var require_function_bind = __commonJS((exports, module) => {
  var implementation = require_implementation();
  module.exports = Function.prototype.bind || implementation;
});

// node_modules/call-bind-apply-helpers/functionCall.js
var require_functionCall = __commonJS((exports, module) => {
  module.exports = Function.prototype.call;
});

// node_modules/call-bind-apply-helpers/functionApply.js
var require_functionApply = __commonJS((exports, module) => {
  module.exports = Function.prototype.apply;
});

// node_modules/call-bind-apply-helpers/reflectApply.js
var require_reflectApply = __commonJS((exports, module) => {
  module.exports = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
});

// node_modules/call-bind-apply-helpers/actualApply.js
var require_actualApply = __commonJS((exports, module) => {
  var bind2 = require_function_bind();
  var $apply = require_functionApply();
  var $call = require_functionCall();
  var $reflectApply = require_reflectApply();
  module.exports = $reflectApply || bind2.call($call, $apply);
});

// node_modules/call-bind-apply-helpers/index.js
var require_call_bind_apply_helpers = __commonJS((exports, module) => {
  var bind2 = require_function_bind();
  var $TypeError = require_type();
  var $call = require_functionCall();
  var $actualApply = require_actualApply();
  module.exports = function callBindBasic(args) {
    if (args.length < 1 || typeof args[0] !== "function") {
      throw new $TypeError("a function is required");
    }
    return $actualApply(bind2, $call, args);
  };
});

// node_modules/dunder-proto/get.js
var require_get = __commonJS((exports, module) => {
  var callBind = require_call_bind_apply_helpers();
  var gOPD = require_gopd();
  var hasProtoAccessor;
  try {
    hasProtoAccessor = [].__proto__ === Array.prototype;
  } catch (e) {
    if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS") {
      throw e;
    }
  }
  var desc = !!hasProtoAccessor && gOPD && gOPD(Object.prototype, "__proto__");
  var $Object = Object;
  var $getPrototypeOf = $Object.getPrototypeOf;
  module.exports = desc && typeof desc.get === "function" ? callBind([desc.get]) : typeof $getPrototypeOf === "function" ? function getDunder(value) {
    return $getPrototypeOf(value == null ? value : $Object(value));
  } : false;
});

// node_modules/get-proto/index.js
var require_get_proto = __commonJS((exports, module) => {
  var reflectGetProto = require_Reflect_getPrototypeOf();
  var originalGetProto = require_Object_getPrototypeOf();
  var getDunderProto = require_get();
  module.exports = reflectGetProto ? function getProto(O) {
    return reflectGetProto(O);
  } : originalGetProto ? function getProto(O) {
    if (!O || typeof O !== "object" && typeof O !== "function") {
      throw new TypeError("getProto: not an object");
    }
    return originalGetProto(O);
  } : getDunderProto ? function getProto(O) {
    return getDunderProto(O);
  } : null;
});

// node_modules/hasown/index.js
var require_hasown = __commonJS((exports, module) => {
  var call = Function.prototype.call;
  var $hasOwn = Object.prototype.hasOwnProperty;
  var bind2 = require_function_bind();
  module.exports = bind2.call(call, $hasOwn);
});

// node_modules/get-intrinsic/index.js
var require_get_intrinsic = __commonJS((exports, module) => {
  var undefined2;
  var $Object = require_es_object_atoms();
  var $Error = require_es_errors();
  var $EvalError = require_eval();
  var $RangeError = require_range();
  var $ReferenceError = require_ref();
  var $SyntaxError = require_syntax();
  var $TypeError = require_type();
  var $URIError = require_uri();
  var abs = require_abs();
  var floor = require_floor();
  var max = require_max();
  var min = require_min();
  var pow = require_pow();
  var round = require_round();
  var sign = require_sign();
  var $Function = Function;
  var getEvalledConstructor = function(expressionSyntax) {
    try {
      return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
    } catch (e) {}
  };
  var $gOPD = require_gopd();
  var $defineProperty = require_es_define_property();
  var throwTypeError = function() {
    throw new $TypeError;
  };
  var ThrowTypeError = $gOPD ? function() {
    try {
      arguments.callee;
      return throwTypeError;
    } catch (calleeThrows) {
      try {
        return $gOPD(arguments, "callee").get;
      } catch (gOPDthrows) {
        return throwTypeError;
      }
    }
  }() : throwTypeError;
  var hasSymbols = require_has_symbols()();
  var getProto = require_get_proto();
  var $ObjectGPO = require_Object_getPrototypeOf();
  var $ReflectGPO = require_Reflect_getPrototypeOf();
  var $apply = require_functionApply();
  var $call = require_functionCall();
  var needsEval = {};
  var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined2 : getProto(Uint8Array);
  var INTRINSICS = {
    __proto__: null,
    "%AggregateError%": typeof AggregateError === "undefined" ? undefined2 : AggregateError,
    "%Array%": Array,
    "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer,
    "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
    "%AsyncFromSyncIteratorPrototype%": undefined2,
    "%AsyncFunction%": needsEval,
    "%AsyncGenerator%": needsEval,
    "%AsyncGeneratorFunction%": needsEval,
    "%AsyncIteratorPrototype%": needsEval,
    "%Atomics%": typeof Atomics === "undefined" ? undefined2 : Atomics,
    "%BigInt%": typeof BigInt === "undefined" ? undefined2 : BigInt,
    "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined2 : BigInt64Array,
    "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined2 : BigUint64Array,
    "%Boolean%": Boolean,
    "%DataView%": typeof DataView === "undefined" ? undefined2 : DataView,
    "%Date%": Date,
    "%decodeURI%": decodeURI,
    "%decodeURIComponent%": decodeURIComponent,
    "%encodeURI%": encodeURI,
    "%encodeURIComponent%": encodeURIComponent,
    "%Error%": $Error,
    "%eval%": eval,
    "%EvalError%": $EvalError,
    "%Float16Array%": typeof Float16Array === "undefined" ? undefined2 : Float16Array,
    "%Float32Array%": typeof Float32Array === "undefined" ? undefined2 : Float32Array,
    "%Float64Array%": typeof Float64Array === "undefined" ? undefined2 : Float64Array,
    "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined2 : FinalizationRegistry,
    "%Function%": $Function,
    "%GeneratorFunction%": needsEval,
    "%Int8Array%": typeof Int8Array === "undefined" ? undefined2 : Int8Array,
    "%Int16Array%": typeof Int16Array === "undefined" ? undefined2 : Int16Array,
    "%Int32Array%": typeof Int32Array === "undefined" ? undefined2 : Int32Array,
    "%isFinite%": isFinite,
    "%isNaN%": isNaN,
    "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
    "%JSON%": typeof JSON === "object" ? JSON : undefined2,
    "%Map%": typeof Map === "undefined" ? undefined2 : Map,
    "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto(new Map()[Symbol.iterator]()),
    "%Math%": Math,
    "%Number%": Number,
    "%Object%": $Object,
    "%Object.getOwnPropertyDescriptor%": $gOPD,
    "%parseFloat%": parseFloat,
    "%parseInt%": parseInt,
    "%Promise%": typeof Promise === "undefined" ? undefined2 : Promise,
    "%Proxy%": typeof Proxy === "undefined" ? undefined2 : Proxy,
    "%RangeError%": $RangeError,
    "%ReferenceError%": $ReferenceError,
    "%Reflect%": typeof Reflect === "undefined" ? undefined2 : Reflect,
    "%RegExp%": RegExp,
    "%Set%": typeof Set === "undefined" ? undefined2 : Set,
    "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto(new Set()[Symbol.iterator]()),
    "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer,
    "%String%": String,
    "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
    "%Symbol%": hasSymbols ? Symbol : undefined2,
    "%SyntaxError%": $SyntaxError,
    "%ThrowTypeError%": ThrowTypeError,
    "%TypedArray%": TypedArray,
    "%TypeError%": $TypeError,
    "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array,
    "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray,
    "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array,
    "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array,
    "%URIError%": $URIError,
    "%WeakMap%": typeof WeakMap === "undefined" ? undefined2 : WeakMap,
    "%WeakRef%": typeof WeakRef === "undefined" ? undefined2 : WeakRef,
    "%WeakSet%": typeof WeakSet === "undefined" ? undefined2 : WeakSet,
    "%Function.prototype.call%": $call,
    "%Function.prototype.apply%": $apply,
    "%Object.defineProperty%": $defineProperty,
    "%Object.getPrototypeOf%": $ObjectGPO,
    "%Math.abs%": abs,
    "%Math.floor%": floor,
    "%Math.max%": max,
    "%Math.min%": min,
    "%Math.pow%": pow,
    "%Math.round%": round,
    "%Math.sign%": sign,
    "%Reflect.getPrototypeOf%": $ReflectGPO
  };
  if (getProto) {
    try {
      null.error;
    } catch (e) {
      errorProto = getProto(getProto(e));
      INTRINSICS["%Error.prototype%"] = errorProto;
    }
  }
  var errorProto;
  var doEval = function doEval2(name) {
    var value;
    if (name === "%AsyncFunction%") {
      value = getEvalledConstructor("async function () {}");
    } else if (name === "%GeneratorFunction%") {
      value = getEvalledConstructor("function* () {}");
    } else if (name === "%AsyncGeneratorFunction%") {
      value = getEvalledConstructor("async function* () {}");
    } else if (name === "%AsyncGenerator%") {
      var fn = doEval2("%AsyncGeneratorFunction%");
      if (fn) {
        value = fn.prototype;
      }
    } else if (name === "%AsyncIteratorPrototype%") {
      var gen = doEval2("%AsyncGenerator%");
      if (gen && getProto) {
        value = getProto(gen.prototype);
      }
    }
    INTRINSICS[name] = value;
    return value;
  };
  var LEGACY_ALIASES = {
    __proto__: null,
    "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
    "%ArrayPrototype%": ["Array", "prototype"],
    "%ArrayProto_entries%": ["Array", "prototype", "entries"],
    "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
    "%ArrayProto_keys%": ["Array", "prototype", "keys"],
    "%ArrayProto_values%": ["Array", "prototype", "values"],
    "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
    "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
    "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
    "%BooleanPrototype%": ["Boolean", "prototype"],
    "%DataViewPrototype%": ["DataView", "prototype"],
    "%DatePrototype%": ["Date", "prototype"],
    "%ErrorPrototype%": ["Error", "prototype"],
    "%EvalErrorPrototype%": ["EvalError", "prototype"],
    "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
    "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
    "%FunctionPrototype%": ["Function", "prototype"],
    "%Generator%": ["GeneratorFunction", "prototype"],
    "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
    "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
    "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
    "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
    "%JSONParse%": ["JSON", "parse"],
    "%JSONStringify%": ["JSON", "stringify"],
    "%MapPrototype%": ["Map", "prototype"],
    "%NumberPrototype%": ["Number", "prototype"],
    "%ObjectPrototype%": ["Object", "prototype"],
    "%ObjProto_toString%": ["Object", "prototype", "toString"],
    "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
    "%PromisePrototype%": ["Promise", "prototype"],
    "%PromiseProto_then%": ["Promise", "prototype", "then"],
    "%Promise_all%": ["Promise", "all"],
    "%Promise_reject%": ["Promise", "reject"],
    "%Promise_resolve%": ["Promise", "resolve"],
    "%RangeErrorPrototype%": ["RangeError", "prototype"],
    "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
    "%RegExpPrototype%": ["RegExp", "prototype"],
    "%SetPrototype%": ["Set", "prototype"],
    "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
    "%StringPrototype%": ["String", "prototype"],
    "%SymbolPrototype%": ["Symbol", "prototype"],
    "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
    "%TypedArrayPrototype%": ["TypedArray", "prototype"],
    "%TypeErrorPrototype%": ["TypeError", "prototype"],
    "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
    "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
    "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
    "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
    "%URIErrorPrototype%": ["URIError", "prototype"],
    "%WeakMapPrototype%": ["WeakMap", "prototype"],
    "%WeakSetPrototype%": ["WeakSet", "prototype"]
  };
  var bind2 = require_function_bind();
  var hasOwn = require_hasown();
  var $concat = bind2.call($call, Array.prototype.concat);
  var $spliceApply = bind2.call($apply, Array.prototype.splice);
  var $replace = bind2.call($call, String.prototype.replace);
  var $strSlice = bind2.call($call, String.prototype.slice);
  var $exec = bind2.call($call, RegExp.prototype.exec);
  var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
  var reEscapeChar = /\\(\\)?/g;
  var stringToPath = function stringToPath2(string) {
    var first = $strSlice(string, 0, 1);
    var last = $strSlice(string, -1);
    if (first === "%" && last !== "%") {
      throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
    } else if (last === "%" && first !== "%") {
      throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
    }
    var result = [];
    $replace(string, rePropName, function(match, number, quote, subString) {
      result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
    });
    return result;
  };
  var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
    var intrinsicName = name;
    var alias;
    if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
      alias = LEGACY_ALIASES[intrinsicName];
      intrinsicName = "%" + alias[0] + "%";
    }
    if (hasOwn(INTRINSICS, intrinsicName)) {
      var value = INTRINSICS[intrinsicName];
      if (value === needsEval) {
        value = doEval(intrinsicName);
      }
      if (typeof value === "undefined" && !allowMissing) {
        throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
      }
      return {
        alias,
        name: intrinsicName,
        value
      };
    }
    throw new $SyntaxError("intrinsic " + name + " does not exist!");
  };
  module.exports = function GetIntrinsic(name, allowMissing) {
    if (typeof name !== "string" || name.length === 0) {
      throw new $TypeError("intrinsic name must be a non-empty string");
    }
    if (arguments.length > 1 && typeof allowMissing !== "boolean") {
      throw new $TypeError('"allowMissing" argument must be a boolean');
    }
    if ($exec(/^%?[^%]*%?$/, name) === null) {
      throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
    }
    var parts = stringToPath(name);
    var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
    var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
    var intrinsicRealName = intrinsic.name;
    var value = intrinsic.value;
    var skipFurtherCaching = false;
    var alias = intrinsic.alias;
    if (alias) {
      intrinsicBaseName = alias[0];
      $spliceApply(parts, $concat([0, 1], alias));
    }
    for (var i = 1, isOwn = true;i < parts.length; i += 1) {
      var part = parts[i];
      var first = $strSlice(part, 0, 1);
      var last = $strSlice(part, -1);
      if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
        throw new $SyntaxError("property names with quotes must have matching quotes");
      }
      if (part === "constructor" || !isOwn) {
        skipFurtherCaching = true;
      }
      intrinsicBaseName += "." + part;
      intrinsicRealName = "%" + intrinsicBaseName + "%";
      if (hasOwn(INTRINSICS, intrinsicRealName)) {
        value = INTRINSICS[intrinsicRealName];
      } else if (value != null) {
        if (!(part in value)) {
          if (!allowMissing) {
            throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
          }
          return;
        }
        if ($gOPD && i + 1 >= parts.length) {
          var desc = $gOPD(value, part);
          isOwn = !!desc;
          if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
            value = desc.get;
          } else {
            value = value[part];
          }
        } else {
          isOwn = hasOwn(value, part);
          value = value[part];
        }
        if (isOwn && !skipFurtherCaching) {
          INTRINSICS[intrinsicRealName] = value;
        }
      }
    }
    return value;
  };
});

// node_modules/has-tostringtag/shams.js
var require_shams2 = __commonJS((exports, module) => {
  var hasSymbols = require_shams();
  module.exports = function hasToStringTagShams() {
    return hasSymbols() && !!Symbol.toStringTag;
  };
});

// node_modules/es-set-tostringtag/index.js
var require_es_set_tostringtag = __commonJS((exports, module) => {
  var GetIntrinsic = require_get_intrinsic();
  var $defineProperty = GetIntrinsic("%Object.defineProperty%", true);
  var hasToStringTag = require_shams2()();
  var hasOwn = require_hasown();
  var $TypeError = require_type();
  var toStringTag2 = hasToStringTag ? Symbol.toStringTag : null;
  module.exports = function setToStringTag(object, value) {
    var overrideIfSet = arguments.length > 2 && !!arguments[2] && arguments[2].force;
    var nonConfigurable = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
    if (typeof overrideIfSet !== "undefined" && typeof overrideIfSet !== "boolean" || typeof nonConfigurable !== "undefined" && typeof nonConfigurable !== "boolean") {
      throw new $TypeError("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
    }
    if (toStringTag2 && (overrideIfSet || !hasOwn(object, toStringTag2))) {
      if ($defineProperty) {
        $defineProperty(object, toStringTag2, {
          configurable: !nonConfigurable,
          enumerable: false,
          value,
          writable: false
        });
      } else {
        object[toStringTag2] = value;
      }
    }
  };
});

// node_modules/form-data/lib/populate.js
var require_populate = __commonJS((exports, module) => {
  module.exports = function(dst, src) {
    Object.keys(src).forEach(function(prop) {
      dst[prop] = dst[prop] || src[prop];
    });
    return dst;
  };
});

// node_modules/form-data/lib/form_data.js
var require_form_data = __commonJS((exports, module) => {
  var CombinedStream = require_combined_stream();
  var util = __require("util");
  var path = __require("path");
  var http = __require("http");
  var https = __require("https");
  var parseUrl = __require("url").parse;
  var fs = __require("fs");
  var Stream = __require("stream").Stream;
  var crypto = __require("crypto");
  var mime = require_mime_types();
  var asynckit = require_asynckit();
  var setToStringTag = require_es_set_tostringtag();
  var hasOwn = require_hasown();
  var populate = require_populate();
  function FormData2(options) {
    if (!(this instanceof FormData2)) {
      return new FormData2(options);
    }
    this._overheadLength = 0;
    this._valueLength = 0;
    this._valuesToMeasure = [];
    CombinedStream.call(this);
    options = options || {};
    for (var option in options) {
      this[option] = options[option];
    }
  }
  util.inherits(FormData2, CombinedStream);
  FormData2.LINE_BREAK = `\r
`;
  FormData2.DEFAULT_CONTENT_TYPE = "application/octet-stream";
  FormData2.prototype.append = function(field, value, options) {
    options = options || {};
    if (typeof options === "string") {
      options = { filename: options };
    }
    var append = CombinedStream.prototype.append.bind(this);
    if (typeof value === "number" || value == null) {
      value = String(value);
    }
    if (Array.isArray(value)) {
      this._error(new Error("Arrays are not supported."));
      return;
    }
    var header = this._multiPartHeader(field, value, options);
    var footer = this._multiPartFooter();
    append(header);
    append(value);
    append(footer);
    this._trackLength(header, value, options);
  };
  FormData2.prototype._trackLength = function(header, value, options) {
    var valueLength = 0;
    if (options.knownLength != null) {
      valueLength += Number(options.knownLength);
    } else if (Buffer.isBuffer(value)) {
      valueLength = value.length;
    } else if (typeof value === "string") {
      valueLength = Buffer.byteLength(value);
    }
    this._valueLength += valueLength;
    this._overheadLength += Buffer.byteLength(header) + FormData2.LINE_BREAK.length;
    if (!value || !value.path && !(value.readable && hasOwn(value, "httpVersion")) && !(value instanceof Stream)) {
      return;
    }
    if (!options.knownLength) {
      this._valuesToMeasure.push(value);
    }
  };
  FormData2.prototype._lengthRetriever = function(value, callback) {
    if (hasOwn(value, "fd")) {
      if (value.end != null && value.end != Infinity && value.start != null) {
        callback(null, value.end + 1 - (value.start ? value.start : 0));
      } else {
        fs.stat(value.path, function(err, stat) {
          if (err) {
            callback(err);
            return;
          }
          var fileSize = stat.size - (value.start ? value.start : 0);
          callback(null, fileSize);
        });
      }
    } else if (hasOwn(value, "httpVersion")) {
      callback(null, Number(value.headers["content-length"]));
    } else if (hasOwn(value, "httpModule")) {
      value.on("response", function(response) {
        value.pause();
        callback(null, Number(response.headers["content-length"]));
      });
      value.resume();
    } else {
      callback("Unknown stream");
    }
  };
  FormData2.prototype._multiPartHeader = function(field, value, options) {
    if (typeof options.header === "string") {
      return options.header;
    }
    var contentDisposition = this._getContentDisposition(value, options);
    var contentType = this._getContentType(value, options);
    var contents = "";
    var headers = {
      "Content-Disposition": ["form-data", 'name="' + field + '"'].concat(contentDisposition || []),
      "Content-Type": [].concat(contentType || [])
    };
    if (typeof options.header === "object") {
      populate(headers, options.header);
    }
    var header;
    for (var prop in headers) {
      if (hasOwn(headers, prop)) {
        header = headers[prop];
        if (header == null) {
          continue;
        }
        if (!Array.isArray(header)) {
          header = [header];
        }
        if (header.length) {
          contents += prop + ": " + header.join("; ") + FormData2.LINE_BREAK;
        }
      }
    }
    return "--" + this.getBoundary() + FormData2.LINE_BREAK + contents + FormData2.LINE_BREAK;
  };
  FormData2.prototype._getContentDisposition = function(value, options) {
    var filename;
    if (typeof options.filepath === "string") {
      filename = path.normalize(options.filepath).replace(/\\/g, "/");
    } else if (options.filename || value && (value.name || value.path)) {
      filename = path.basename(options.filename || value && (value.name || value.path));
    } else if (value && value.readable && hasOwn(value, "httpVersion")) {
      filename = path.basename(value.client._httpMessage.path || "");
    }
    if (filename) {
      return 'filename="' + filename + '"';
    }
  };
  FormData2.prototype._getContentType = function(value, options) {
    var contentType = options.contentType;
    if (!contentType && value && value.name) {
      contentType = mime.lookup(value.name);
    }
    if (!contentType && value && value.path) {
      contentType = mime.lookup(value.path);
    }
    if (!contentType && value && value.readable && hasOwn(value, "httpVersion")) {
      contentType = value.headers["content-type"];
    }
    if (!contentType && (options.filepath || options.filename)) {
      contentType = mime.lookup(options.filepath || options.filename);
    }
    if (!contentType && value && typeof value === "object") {
      contentType = FormData2.DEFAULT_CONTENT_TYPE;
    }
    return contentType;
  };
  FormData2.prototype._multiPartFooter = function() {
    return function(next) {
      var footer = FormData2.LINE_BREAK;
      var lastPart = this._streams.length === 0;
      if (lastPart) {
        footer += this._lastBoundary();
      }
      next(footer);
    }.bind(this);
  };
  FormData2.prototype._lastBoundary = function() {
    return "--" + this.getBoundary() + "--" + FormData2.LINE_BREAK;
  };
  FormData2.prototype.getHeaders = function(userHeaders) {
    var header;
    var formHeaders = {
      "content-type": "multipart/form-data; boundary=" + this.getBoundary()
    };
    for (header in userHeaders) {
      if (hasOwn(userHeaders, header)) {
        formHeaders[header.toLowerCase()] = userHeaders[header];
      }
    }
    return formHeaders;
  };
  FormData2.prototype.setBoundary = function(boundary) {
    if (typeof boundary !== "string") {
      throw new TypeError("FormData boundary must be a string");
    }
    this._boundary = boundary;
  };
  FormData2.prototype.getBoundary = function() {
    if (!this._boundary) {
      this._generateBoundary();
    }
    return this._boundary;
  };
  FormData2.prototype.getBuffer = function() {
    var dataBuffer = new Buffer.alloc(0);
    var boundary = this.getBoundary();
    for (var i = 0, len = this._streams.length;i < len; i++) {
      if (typeof this._streams[i] !== "function") {
        if (Buffer.isBuffer(this._streams[i])) {
          dataBuffer = Buffer.concat([dataBuffer, this._streams[i]]);
        } else {
          dataBuffer = Buffer.concat([dataBuffer, Buffer.from(this._streams[i])]);
        }
        if (typeof this._streams[i] !== "string" || this._streams[i].substring(2, boundary.length + 2) !== boundary) {
          dataBuffer = Buffer.concat([dataBuffer, Buffer.from(FormData2.LINE_BREAK)]);
        }
      }
    }
    return Buffer.concat([dataBuffer, Buffer.from(this._lastBoundary())]);
  };
  FormData2.prototype._generateBoundary = function() {
    this._boundary = "--------------------------" + crypto.randomBytes(12).toString("hex");
  };
  FormData2.prototype.getLengthSync = function() {
    var knownLength = this._overheadLength + this._valueLength;
    if (this._streams.length) {
      knownLength += this._lastBoundary().length;
    }
    if (!this.hasKnownLength()) {
      this._error(new Error("Cannot calculate proper length in synchronous way."));
    }
    return knownLength;
  };
  FormData2.prototype.hasKnownLength = function() {
    var hasKnownLength = true;
    if (this._valuesToMeasure.length) {
      hasKnownLength = false;
    }
    return hasKnownLength;
  };
  FormData2.prototype.getLength = function(cb) {
    var knownLength = this._overheadLength + this._valueLength;
    if (this._streams.length) {
      knownLength += this._lastBoundary().length;
    }
    if (!this._valuesToMeasure.length) {
      process.nextTick(cb.bind(this, null, knownLength));
      return;
    }
    asynckit.parallel(this._valuesToMeasure, this._lengthRetriever, function(err, values) {
      if (err) {
        cb(err);
        return;
      }
      values.forEach(function(length) {
        knownLength += length;
      });
      cb(null, knownLength);
    });
  };
  FormData2.prototype.submit = function(params, cb) {
    var request;
    var options;
    var defaults = { method: "post" };
    if (typeof params === "string") {
      params = parseUrl(params);
      options = populate({
        port: params.port,
        path: params.pathname,
        host: params.hostname,
        protocol: params.protocol
      }, defaults);
    } else {
      options = populate(params, defaults);
      if (!options.port) {
        options.port = options.protocol === "https:" ? 443 : 80;
      }
    }
    options.headers = this.getHeaders(params.headers);
    if (options.protocol === "https:") {
      request = https.request(options);
    } else {
      request = http.request(options);
    }
    this.getLength(function(err, length) {
      if (err && err !== "Unknown stream") {
        this._error(err);
        return;
      }
      if (length) {
        request.setHeader("Content-Length", length);
      }
      this.pipe(request);
      if (cb) {
        var onResponse;
        var callback = function(error, responce) {
          request.removeListener("error", callback);
          request.removeListener("response", onResponse);
          return cb.call(this, error, responce);
        };
        onResponse = callback.bind(this, null);
        request.on("error", callback);
        request.on("response", onResponse);
      }
    }.bind(this));
    return request;
  };
  FormData2.prototype._error = function(err) {
    if (!this.error) {
      this.error = err;
      this.pause();
      this.emit("error", err);
    }
  };
  FormData2.prototype.toString = function() {
    return "[object FormData]";
  };
  setToStringTag(FormData2.prototype, "FormData");
  module.exports = FormData2;
});

// node_modules/proxy-from-env/index.js
var require_proxy_from_env = __commonJS((exports) => {
  var parseUrl = __require("url").parse;
  var DEFAULT_PORTS = {
    ftp: 21,
    gopher: 70,
    http: 80,
    https: 443,
    ws: 80,
    wss: 443
  };
  var stringEndsWith = String.prototype.endsWith || function(s) {
    return s.length <= this.length && this.indexOf(s, this.length - s.length) !== -1;
  };
  function getProxyForUrl(url2) {
    var parsedUrl = typeof url2 === "string" ? parseUrl(url2) : url2 || {};
    var proto = parsedUrl.protocol;
    var hostname = parsedUrl.host;
    var port = parsedUrl.port;
    if (typeof hostname !== "string" || !hostname || typeof proto !== "string") {
      return "";
    }
    proto = proto.split(":", 1)[0];
    hostname = hostname.replace(/:\d*$/, "");
    port = parseInt(port) || DEFAULT_PORTS[proto] || 0;
    if (!shouldProxy(hostname, port)) {
      return "";
    }
    var proxy = getEnv("npm_config_" + proto + "_proxy") || getEnv(proto + "_proxy") || getEnv("npm_config_proxy") || getEnv("all_proxy");
    if (proxy && proxy.indexOf("://") === -1) {
      proxy = proto + "://" + proxy;
    }
    return proxy;
  }
  function shouldProxy(hostname, port) {
    var NO_PROXY = (getEnv("npm_config_no_proxy") || getEnv("no_proxy")).toLowerCase();
    if (!NO_PROXY) {
      return true;
    }
    if (NO_PROXY === "*") {
      return false;
    }
    return NO_PROXY.split(/[,\s]/).every(function(proxy) {
      if (!proxy) {
        return true;
      }
      var parsedProxy = proxy.match(/^(.+):(\d+)$/);
      var parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
      var parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
      if (parsedProxyPort && parsedProxyPort !== port) {
        return true;
      }
      if (!/^[.*]/.test(parsedProxyHostname)) {
        return hostname !== parsedProxyHostname;
      }
      if (parsedProxyHostname.charAt(0) === "*") {
        parsedProxyHostname = parsedProxyHostname.slice(1);
      }
      return !stringEndsWith.call(hostname, parsedProxyHostname);
    });
  }
  function getEnv(key) {
    return process.env[key.toLowerCase()] || process.env[key.toUpperCase()] || "";
  }
  exports.getProxyForUrl = getProxyForUrl;
});

// node_modules/ms/index.js
var require_ms = __commonJS((exports, module) => {
  var s = 1000;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var y = d * 365.25;
  module.exports = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isNaN(val) === false) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return;
    }
  }
  function fmtShort(ms) {
    if (ms >= d) {
      return Math.round(ms / d) + "d";
    }
    if (ms >= h) {
      return Math.round(ms / h) + "h";
    }
    if (ms >= m) {
      return Math.round(ms / m) + "m";
    }
    if (ms >= s) {
      return Math.round(ms / s) + "s";
    }
    return ms + "ms";
  }
  function fmtLong(ms) {
    return plural(ms, d, "day") || plural(ms, h, "hour") || plural(ms, m, "minute") || plural(ms, s, "second") || ms + " ms";
  }
  function plural(ms, n, name) {
    if (ms < n) {
      return;
    }
    if (ms < n * 1.5) {
      return Math.floor(ms / n) + " " + name;
    }
    return Math.ceil(ms / n) + " " + name + "s";
  }
});

// node_modules/debug/src/debug.js
var require_debug = __commonJS((exports, module) => {
  exports = module.exports = createDebug.debug = createDebug["default"] = createDebug;
  exports.coerce = coerce;
  exports.disable = disable;
  exports.enable = enable;
  exports.enabled = enabled;
  exports.humanize = require_ms();
  exports.names = [];
  exports.skips = [];
  exports.formatters = {};
  var prevTime;
  function selectColor(namespace) {
    var hash = 0, i;
    for (i in namespace) {
      hash = (hash << 5) - hash + namespace.charCodeAt(i);
      hash |= 0;
    }
    return exports.colors[Math.abs(hash) % exports.colors.length];
  }
  function createDebug(namespace) {
    function debug() {
      if (!debug.enabled)
        return;
      var self2 = debug;
      var curr = +new Date;
      var ms = curr - (prevTime || curr);
      self2.diff = ms;
      self2.prev = prevTime;
      self2.curr = curr;
      prevTime = curr;
      var args = new Array(arguments.length);
      for (var i = 0;i < args.length; i++) {
        args[i] = arguments[i];
      }
      args[0] = exports.coerce(args[0]);
      if (typeof args[0] !== "string") {
        args.unshift("%O");
      }
      var index = 0;
      args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
        if (match === "%%")
          return match;
        index++;
        var formatter = exports.formatters[format];
        if (typeof formatter === "function") {
          var val = args[index];
          match = formatter.call(self2, val);
          args.splice(index, 1);
          index--;
        }
        return match;
      });
      exports.formatArgs.call(self2, args);
      var logFn = debug.log || exports.log || console.log.bind(console);
      logFn.apply(self2, args);
    }
    debug.namespace = namespace;
    debug.enabled = exports.enabled(namespace);
    debug.useColors = exports.useColors();
    debug.color = selectColor(namespace);
    if (typeof exports.init === "function") {
      exports.init(debug);
    }
    return debug;
  }
  function enable(namespaces) {
    exports.save(namespaces);
    exports.names = [];
    exports.skips = [];
    var split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
    var len = split.length;
    for (var i = 0;i < len; i++) {
      if (!split[i])
        continue;
      namespaces = split[i].replace(/\*/g, ".*?");
      if (namespaces[0] === "-") {
        exports.skips.push(new RegExp("^" + namespaces.substr(1) + "$"));
      } else {
        exports.names.push(new RegExp("^" + namespaces + "$"));
      }
    }
  }
  function disable() {
    exports.enable("");
  }
  function enabled(name) {
    var i, len;
    for (i = 0, len = exports.skips.length;i < len; i++) {
      if (exports.skips[i].test(name)) {
        return false;
      }
    }
    for (i = 0, len = exports.names.length;i < len; i++) {
      if (exports.names[i].test(name)) {
        return true;
      }
    }
    return false;
  }
  function coerce(val) {
    if (val instanceof Error)
      return val.stack || val.message;
    return val;
  }
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS((exports, module) => {
  exports = module.exports = require_debug();
  exports.log = log;
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.storage = typeof chrome != "undefined" && typeof chrome.storage != "undefined" ? chrome.storage.local : localstorage();
  exports.colors = [
    "lightseagreen",
    "forestgreen",
    "goldenrod",
    "dodgerblue",
    "darkorchid",
    "crimson"
  ];
  function useColors() {
    if (typeof window !== "undefined" && window.process && window.process.type === "renderer") {
      return true;
    }
    return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
  }
  exports.formatters.j = function(v) {
    try {
      return JSON.stringify(v);
    } catch (err) {
      return "[UnexpectedJSONParseError]: " + err.message;
    }
  };
  function formatArgs(args) {
    var useColors2 = this.useColors;
    args[0] = (useColors2 ? "%c" : "") + this.namespace + (useColors2 ? " %c" : " ") + args[0] + (useColors2 ? "%c " : " ") + "+" + exports.humanize(this.diff);
    if (!useColors2)
      return;
    var c = "color: " + this.color;
    args.splice(1, 0, c, "color: inherit");
    var index = 0;
    var lastC = 0;
    args[0].replace(/%[a-zA-Z%]/g, function(match) {
      if (match === "%%")
        return;
      index++;
      if (match === "%c") {
        lastC = index;
      }
    });
    args.splice(lastC, 0, c);
  }
  function log() {
    return typeof console === "object" && console.log && Function.prototype.apply.call(console.log, console, arguments);
  }
  function save(namespaces) {
    try {
      if (namespaces == null) {
        exports.storage.removeItem("debug");
      } else {
        exports.storage.debug = namespaces;
      }
    } catch (e) {}
  }
  function load() {
    var r;
    try {
      r = exports.storage.debug;
    } catch (e) {}
    if (!r && typeof process !== "undefined" && "env" in process) {
      r = process.env.DEBUG;
    }
    return r;
  }
  exports.enable(load());
  function localstorage() {
    try {
      return window.localStorage;
    } catch (e) {}
  }
});

// node_modules/debug/src/node.js
var require_node = __commonJS((exports, module) => {
  var tty = __require("tty");
  var util = __require("util");
  exports = module.exports = require_debug();
  exports.init = init;
  exports.log = log;
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.colors = [6, 2, 3, 4, 5, 1];
  exports.inspectOpts = Object.keys(process.env).filter(function(key) {
    return /^debug_/i.test(key);
  }).reduce(function(obj, key) {
    var prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, function(_, k) {
      return k.toUpperCase();
    });
    var val = process.env[key];
    if (/^(yes|on|true|enabled)$/i.test(val))
      val = true;
    else if (/^(no|off|false|disabled)$/i.test(val))
      val = false;
    else if (val === "null")
      val = null;
    else
      val = Number(val);
    obj[prop] = val;
    return obj;
  }, {});
  var fd = parseInt(process.env.DEBUG_FD, 10) || 2;
  if (fd !== 1 && fd !== 2) {
    util.deprecate(function() {}, "except for stderr(2) and stdout(1), any other usage of DEBUG_FD is deprecated. Override debug.log if you want to use a different log function (https://git.io/debug_fd)")();
  }
  var stream = fd === 1 ? process.stdout : fd === 2 ? process.stderr : createWritableStdioStream(fd);
  function useColors() {
    return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(fd);
  }
  exports.formatters.o = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts).split(`
`).map(function(str) {
      return str.trim();
    }).join(" ");
  };
  exports.formatters.O = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts);
  };
  function formatArgs(args) {
    var name = this.namespace;
    var useColors2 = this.useColors;
    if (useColors2) {
      var c = this.color;
      var prefix = "  \x1B[3" + c + ";1m" + name + " " + "\x1B[0m";
      args[0] = prefix + args[0].split(`
`).join(`
` + prefix);
      args.push("\x1B[3" + c + "m+" + exports.humanize(this.diff) + "\x1B[0m");
    } else {
      args[0] = new Date().toUTCString() + " " + name + " " + args[0];
    }
  }
  function log() {
    return stream.write(util.format.apply(util, arguments) + `
`);
  }
  function save(namespaces) {
    if (namespaces == null) {
      delete process.env.DEBUG;
    } else {
      process.env.DEBUG = namespaces;
    }
  }
  function load() {
    return process.env.DEBUG;
  }
  function createWritableStdioStream(fd2) {
    var stream2;
    var tty_wrap = process.binding("tty_wrap");
    switch (tty_wrap.guessHandleType(fd2)) {
      case "TTY":
        stream2 = new tty.WriteStream(fd2);
        stream2._type = "tty";
        if (stream2._handle && stream2._handle.unref) {
          stream2._handle.unref();
        }
        break;
      case "FILE":
        var fs = __require("fs");
        stream2 = new fs.SyncWriteStream(fd2, { autoClose: false });
        stream2._type = "fs";
        break;
      case "PIPE":
      case "TCP":
        var net = __require("net");
        stream2 = new net.Socket({
          fd: fd2,
          readable: false,
          writable: true
        });
        stream2.readable = false;
        stream2.read = null;
        stream2._type = "pipe";
        if (stream2._handle && stream2._handle.unref) {
          stream2._handle.unref();
        }
        break;
      default:
        throw new Error("Implement me. Unknown stream file type!");
    }
    stream2.fd = fd2;
    stream2._isStdio = true;
    return stream2;
  }
  function init(debug) {
    debug.inspectOpts = {};
    var keys = Object.keys(exports.inspectOpts);
    for (var i = 0;i < keys.length; i++) {
      debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
    }
  }
  exports.enable(load());
});

// node_modules/debug/src/index.js
var require_src = __commonJS((exports, module) => {
  if (typeof process !== "undefined" && process.type === "renderer") {
    module.exports = require_browser();
  } else {
    module.exports = require_node();
  }
});

// node_modules/follow-redirects/debug.js
var require_debug2 = __commonJS((exports, module) => {
  var debug;
  module.exports = function() {
    if (!debug) {
      try {
        debug = require_src()("follow-redirects");
      } catch (error) {}
      if (typeof debug !== "function") {
        debug = function() {};
      }
    }
    debug.apply(null, arguments);
  };
});

// node_modules/follow-redirects/index.js
var require_follow_redirects = __commonJS((exports, module) => {
  var url2 = __require("url");
  var URL2 = url2.URL;
  var http = __require("http");
  var https = __require("https");
  var Writable = __require("stream").Writable;
  var assert = __require("assert");
  var debug = require_debug2();
  (function detectUnsupportedEnvironment() {
    var looksLikeNode = typeof process !== "undefined";
    var looksLikeBrowser = typeof window !== "undefined" && typeof document !== "undefined";
    var looksLikeV8 = isFunction2(Error.captureStackTrace);
    if (!looksLikeNode && (looksLikeBrowser || !looksLikeV8)) {
      console.warn("The follow-redirects package should be excluded from browser builds.");
    }
  })();
  var useNativeURL = false;
  try {
    assert(new URL2(""));
  } catch (error) {
    useNativeURL = error.code === "ERR_INVALID_URL";
  }
  var preservedUrlFields = [
    "auth",
    "host",
    "hostname",
    "href",
    "path",
    "pathname",
    "port",
    "protocol",
    "query",
    "search",
    "hash"
  ];
  var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
  var eventHandlers = Object.create(null);
  events.forEach(function(event) {
    eventHandlers[event] = function(arg1, arg2, arg3) {
      this._redirectable.emit(event, arg1, arg2, arg3);
    };
  });
  var InvalidUrlError = createErrorType("ERR_INVALID_URL", "Invalid URL", TypeError);
  var RedirectionError = createErrorType("ERR_FR_REDIRECTION_FAILURE", "Redirected request failed");
  var TooManyRedirectsError = createErrorType("ERR_FR_TOO_MANY_REDIRECTS", "Maximum number of redirects exceeded", RedirectionError);
  var MaxBodyLengthExceededError = createErrorType("ERR_FR_MAX_BODY_LENGTH_EXCEEDED", "Request body larger than maxBodyLength limit");
  var WriteAfterEndError = createErrorType("ERR_STREAM_WRITE_AFTER_END", "write after end");
  var destroy = Writable.prototype.destroy || noop2;
  function RedirectableRequest(options, responseCallback) {
    Writable.call(this);
    this._sanitizeOptions(options);
    this._options = options;
    this._ended = false;
    this._ending = false;
    this._redirectCount = 0;
    this._redirects = [];
    this._requestBodyLength = 0;
    this._requestBodyBuffers = [];
    if (responseCallback) {
      this.on("response", responseCallback);
    }
    var self2 = this;
    this._onNativeResponse = function(response) {
      try {
        self2._processResponse(response);
      } catch (cause) {
        self2.emit("error", cause instanceof RedirectionError ? cause : new RedirectionError({ cause }));
      }
    };
    this._performRequest();
  }
  RedirectableRequest.prototype = Object.create(Writable.prototype);
  RedirectableRequest.prototype.abort = function() {
    destroyRequest(this._currentRequest);
    this._currentRequest.abort();
    this.emit("abort");
  };
  RedirectableRequest.prototype.destroy = function(error) {
    destroyRequest(this._currentRequest, error);
    destroy.call(this, error);
    return this;
  };
  RedirectableRequest.prototype.write = function(data, encoding, callback) {
    if (this._ending) {
      throw new WriteAfterEndError;
    }
    if (!isString2(data) && !isBuffer2(data)) {
      throw new TypeError("data should be a string, Buffer or Uint8Array");
    }
    if (isFunction2(encoding)) {
      callback = encoding;
      encoding = null;
    }
    if (data.length === 0) {
      if (callback) {
        callback();
      }
      return;
    }
    if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
      this._requestBodyLength += data.length;
      this._requestBodyBuffers.push({ data, encoding });
      this._currentRequest.write(data, encoding, callback);
    } else {
      this.emit("error", new MaxBodyLengthExceededError);
      this.abort();
    }
  };
  RedirectableRequest.prototype.end = function(data, encoding, callback) {
    if (isFunction2(data)) {
      callback = data;
      data = encoding = null;
    } else if (isFunction2(encoding)) {
      callback = encoding;
      encoding = null;
    }
    if (!data) {
      this._ended = this._ending = true;
      this._currentRequest.end(null, null, callback);
    } else {
      var self2 = this;
      var currentRequest = this._currentRequest;
      this.write(data, encoding, function() {
        self2._ended = true;
        currentRequest.end(null, null, callback);
      });
      this._ending = true;
    }
  };
  RedirectableRequest.prototype.setHeader = function(name, value) {
    this._options.headers[name] = value;
    this._currentRequest.setHeader(name, value);
  };
  RedirectableRequest.prototype.removeHeader = function(name) {
    delete this._options.headers[name];
    this._currentRequest.removeHeader(name);
  };
  RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
    var self2 = this;
    function destroyOnTimeout(socket) {
      socket.setTimeout(msecs);
      socket.removeListener("timeout", socket.destroy);
      socket.addListener("timeout", socket.destroy);
    }
    function startTimer(socket) {
      if (self2._timeout) {
        clearTimeout(self2._timeout);
      }
      self2._timeout = setTimeout(function() {
        self2.emit("timeout");
        clearTimer();
      }, msecs);
      destroyOnTimeout(socket);
    }
    function clearTimer() {
      if (self2._timeout) {
        clearTimeout(self2._timeout);
        self2._timeout = null;
      }
      self2.removeListener("abort", clearTimer);
      self2.removeListener("error", clearTimer);
      self2.removeListener("response", clearTimer);
      self2.removeListener("close", clearTimer);
      if (callback) {
        self2.removeListener("timeout", callback);
      }
      if (!self2.socket) {
        self2._currentRequest.removeListener("socket", startTimer);
      }
    }
    if (callback) {
      this.on("timeout", callback);
    }
    if (this.socket) {
      startTimer(this.socket);
    } else {
      this._currentRequest.once("socket", startTimer);
    }
    this.on("socket", destroyOnTimeout);
    this.on("abort", clearTimer);
    this.on("error", clearTimer);
    this.on("response", clearTimer);
    this.on("close", clearTimer);
    return this;
  };
  [
    "flushHeaders",
    "getHeader",
    "setNoDelay",
    "setSocketKeepAlive"
  ].forEach(function(method) {
    RedirectableRequest.prototype[method] = function(a, b) {
      return this._currentRequest[method](a, b);
    };
  });
  ["aborted", "connection", "socket"].forEach(function(property) {
    Object.defineProperty(RedirectableRequest.prototype, property, {
      get: function() {
        return this._currentRequest[property];
      }
    });
  });
  RedirectableRequest.prototype._sanitizeOptions = function(options) {
    if (!options.headers) {
      options.headers = {};
    }
    if (options.host) {
      if (!options.hostname) {
        options.hostname = options.host;
      }
      delete options.host;
    }
    if (!options.pathname && options.path) {
      var searchPos = options.path.indexOf("?");
      if (searchPos < 0) {
        options.pathname = options.path;
      } else {
        options.pathname = options.path.substring(0, searchPos);
        options.search = options.path.substring(searchPos);
      }
    }
  };
  RedirectableRequest.prototype._performRequest = function() {
    var protocol = this._options.protocol;
    var nativeProtocol = this._options.nativeProtocols[protocol];
    if (!nativeProtocol) {
      throw new TypeError("Unsupported protocol " + protocol);
    }
    if (this._options.agents) {
      var scheme = protocol.slice(0, -1);
      this._options.agent = this._options.agents[scheme];
    }
    var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
    request._redirectable = this;
    for (var event of events) {
      request.on(event, eventHandlers[event]);
    }
    this._currentUrl = /^\//.test(this._options.path) ? url2.format(this._options) : this._options.path;
    if (this._isRedirect) {
      var i = 0;
      var self2 = this;
      var buffers = this._requestBodyBuffers;
      (function writeNext(error) {
        if (request === self2._currentRequest) {
          if (error) {
            self2.emit("error", error);
          } else if (i < buffers.length) {
            var buffer = buffers[i++];
            if (!request.finished) {
              request.write(buffer.data, buffer.encoding, writeNext);
            }
          } else if (self2._ended) {
            request.end();
          }
        }
      })();
    }
  };
  RedirectableRequest.prototype._processResponse = function(response) {
    var statusCode = response.statusCode;
    if (this._options.trackRedirects) {
      this._redirects.push({
        url: this._currentUrl,
        headers: response.headers,
        statusCode
      });
    }
    var location = response.headers.location;
    if (!location || this._options.followRedirects === false || statusCode < 300 || statusCode >= 400) {
      response.responseUrl = this._currentUrl;
      response.redirects = this._redirects;
      this.emit("response", response);
      this._requestBodyBuffers = [];
      return;
    }
    destroyRequest(this._currentRequest);
    response.destroy();
    if (++this._redirectCount > this._options.maxRedirects) {
      throw new TooManyRedirectsError;
    }
    var requestHeaders;
    var beforeRedirect = this._options.beforeRedirect;
    if (beforeRedirect) {
      requestHeaders = Object.assign({
        Host: response.req.getHeader("host")
      }, this._options.headers);
    }
    var method = this._options.method;
    if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
      this._options.method = "GET";
      this._requestBodyBuffers = [];
      removeMatchingHeaders(/^content-/i, this._options.headers);
    }
    var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);
    var currentUrlParts = parseUrl(this._currentUrl);
    var currentHost = currentHostHeader || currentUrlParts.host;
    var currentUrl = /^\w+:/.test(location) ? this._currentUrl : url2.format(Object.assign(currentUrlParts, { host: currentHost }));
    var redirectUrl = resolveUrl(location, currentUrl);
    debug("redirecting to", redirectUrl.href);
    this._isRedirect = true;
    spreadUrlObject(redirectUrl, this._options);
    if (redirectUrl.protocol !== currentUrlParts.protocol && redirectUrl.protocol !== "https:" || redirectUrl.host !== currentHost && !isSubdomain(redirectUrl.host, currentHost)) {
      removeMatchingHeaders(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers);
    }
    if (isFunction2(beforeRedirect)) {
      var responseDetails = {
        headers: response.headers,
        statusCode
      };
      var requestDetails = {
        url: currentUrl,
        method,
        headers: requestHeaders
      };
      beforeRedirect(this._options, responseDetails, requestDetails);
      this._sanitizeOptions(this._options);
    }
    this._performRequest();
  };
  function wrap(protocols) {
    var exports2 = {
      maxRedirects: 21,
      maxBodyLength: 10 * 1024 * 1024
    };
    var nativeProtocols = {};
    Object.keys(protocols).forEach(function(scheme) {
      var protocol = scheme + ":";
      var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
      var wrappedProtocol = exports2[scheme] = Object.create(nativeProtocol);
      function request(input, options, callback) {
        if (isURL(input)) {
          input = spreadUrlObject(input);
        } else if (isString2(input)) {
          input = spreadUrlObject(parseUrl(input));
        } else {
          callback = options;
          options = validateUrl(input);
          input = { protocol };
        }
        if (isFunction2(options)) {
          callback = options;
          options = null;
        }
        options = Object.assign({
          maxRedirects: exports2.maxRedirects,
          maxBodyLength: exports2.maxBodyLength
        }, input, options);
        options.nativeProtocols = nativeProtocols;
        if (!isString2(options.host) && !isString2(options.hostname)) {
          options.hostname = "::1";
        }
        assert.equal(options.protocol, protocol, "protocol mismatch");
        debug("options", options);
        return new RedirectableRequest(options, callback);
      }
      function get(input, options, callback) {
        var wrappedRequest = wrappedProtocol.request(input, options, callback);
        wrappedRequest.end();
        return wrappedRequest;
      }
      Object.defineProperties(wrappedProtocol, {
        request: { value: request, configurable: true, enumerable: true, writable: true },
        get: { value: get, configurable: true, enumerable: true, writable: true }
      });
    });
    return exports2;
  }
  function noop2() {}
  function parseUrl(input) {
    var parsed;
    if (useNativeURL) {
      parsed = new URL2(input);
    } else {
      parsed = validateUrl(url2.parse(input));
      if (!isString2(parsed.protocol)) {
        throw new InvalidUrlError({ input });
      }
    }
    return parsed;
  }
  function resolveUrl(relative, base) {
    return useNativeURL ? new URL2(relative, base) : parseUrl(url2.resolve(base, relative));
  }
  function validateUrl(input) {
    if (/^\[/.test(input.hostname) && !/^\[[:0-9a-f]+\]$/i.test(input.hostname)) {
      throw new InvalidUrlError({ input: input.href || input });
    }
    if (/^\[/.test(input.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)) {
      throw new InvalidUrlError({ input: input.href || input });
    }
    return input;
  }
  function spreadUrlObject(urlObject, target) {
    var spread = target || {};
    for (var key of preservedUrlFields) {
      spread[key] = urlObject[key];
    }
    if (spread.hostname.startsWith("[")) {
      spread.hostname = spread.hostname.slice(1, -1);
    }
    if (spread.port !== "") {
      spread.port = Number(spread.port);
    }
    spread.path = spread.search ? spread.pathname + spread.search : spread.pathname;
    return spread;
  }
  function removeMatchingHeaders(regex, headers) {
    var lastValue;
    for (var header in headers) {
      if (regex.test(header)) {
        lastValue = headers[header];
        delete headers[header];
      }
    }
    return lastValue === null || typeof lastValue === "undefined" ? undefined : String(lastValue).trim();
  }
  function createErrorType(code, message, baseClass) {
    function CustomError(properties) {
      if (isFunction2(Error.captureStackTrace)) {
        Error.captureStackTrace(this, this.constructor);
      }
      Object.assign(this, properties || {});
      this.code = code;
      this.message = this.cause ? message + ": " + this.cause.message : message;
    }
    CustomError.prototype = new (baseClass || Error);
    Object.defineProperties(CustomError.prototype, {
      constructor: {
        value: CustomError,
        enumerable: false
      },
      name: {
        value: "Error [" + code + "]",
        enumerable: false
      }
    });
    return CustomError;
  }
  function destroyRequest(request, error) {
    for (var event of events) {
      request.removeListener(event, eventHandlers[event]);
    }
    request.on("error", noop2);
    request.destroy(error);
  }
  function isSubdomain(subdomain, domain) {
    assert(isString2(subdomain) && isString2(domain));
    var dot = subdomain.length - domain.length - 1;
    return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
  }
  function isString2(value) {
    return typeof value === "string" || value instanceof String;
  }
  function isFunction2(value) {
    return typeof value === "function";
  }
  function isBuffer2(value) {
    return typeof value === "object" && "length" in value;
  }
  function isURL(value) {
    return URL2 && value instanceof URL2;
  }
  module.exports = wrap({ http, https });
  module.exports.wrap = wrap;
});

// node_modules/websocket/lib/utils.js
var require_utils = __commonJS((exports) => {
  var noop2 = exports.noop = function() {};
  exports.extend = function extend2(dest, source) {
    for (var prop in source) {
      dest[prop] = source[prop];
    }
  };
  exports.eventEmitterListenerCount = __require("events").EventEmitter.listenerCount || function(emitter, type) {
    return emitter.listeners(type).length;
  };
  exports.bufferAllocUnsafe = Buffer.allocUnsafe ? Buffer.allocUnsafe : function oldBufferAllocUnsafe(size) {
    return new Buffer(size);
  };
  exports.bufferFromString = Buffer.from ? Buffer.from : function oldBufferFromString(string, encoding) {
    return new Buffer(string, encoding);
  };
  exports.BufferingLogger = function createBufferingLogger(identifier, uniqueID) {
    var logFunction = require_src()(identifier);
    if (logFunction.enabled) {
      var logger = new BufferingLogger(identifier, uniqueID, logFunction);
      var debug = logger.log.bind(logger);
      debug.printOutput = logger.printOutput.bind(logger);
      debug.enabled = logFunction.enabled;
      return debug;
    }
    logFunction.printOutput = noop2;
    return logFunction;
  };
  function BufferingLogger(identifier, uniqueID, logFunction) {
    this.logFunction = logFunction;
    this.identifier = identifier;
    this.uniqueID = uniqueID;
    this.buffer = [];
  }
  BufferingLogger.prototype.log = function() {
    this.buffer.push([new Date, Array.prototype.slice.call(arguments)]);
    return this;
  };
  BufferingLogger.prototype.clear = function() {
    this.buffer = [];
    return this;
  };
  BufferingLogger.prototype.printOutput = function(logFunction) {
    if (!logFunction) {
      logFunction = this.logFunction;
    }
    var uniqueID = this.uniqueID;
    this.buffer.forEach(function(entry) {
      var date = entry[0].toLocaleString();
      var args = entry[1].slice();
      var formatString = args[0];
      if (formatString !== undefined && formatString !== null) {
        formatString = "%s - %s - " + formatString.toString();
        args.splice(0, 1, formatString, date, uniqueID);
        logFunction.apply(global, args);
      }
    });
  };
});

// node_modules/node-gyp-build/node-gyp-build.js
var require_node_gyp_build = __commonJS((exports, module) => {
  var fs = __require("fs");
  var path = __require("path");
  var os = __require("os");
  var runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : __require;
  var vars = process.config && process.config.variables || {};
  var prebuildsOnly = !!process.env.PREBUILDS_ONLY;
  var abi = process.versions.modules;
  var runtime = isElectron() ? "electron" : isNwjs() ? "node-webkit" : "node";
  var arch = process.env.npm_config_arch || os.arch();
  var platform = process.env.npm_config_platform || os.platform();
  var libc = process.env.LIBC || (isAlpine(platform) ? "musl" : "glibc");
  var armv = process.env.ARM_VERSION || (arch === "arm64" ? "8" : vars.arm_version) || "";
  var uv = (process.versions.uv || "").split(".")[0];
  module.exports = load;
  function load(dir) {
    return runtimeRequire(load.resolve(dir));
  }
  load.resolve = load.path = function(dir) {
    dir = path.resolve(dir || ".");
    try {
      var name = runtimeRequire(path.join(dir, "package.json")).name.toUpperCase().replace(/-/g, "_");
      if (process.env[name + "_PREBUILD"])
        dir = process.env[name + "_PREBUILD"];
    } catch (err) {}
    if (!prebuildsOnly) {
      var release = getFirst(path.join(dir, "build/Release"), matchBuild);
      if (release)
        return release;
      var debug = getFirst(path.join(dir, "build/Debug"), matchBuild);
      if (debug)
        return debug;
    }
    var prebuild = resolve(dir);
    if (prebuild)
      return prebuild;
    var nearby = resolve(path.dirname(process.execPath));
    if (nearby)
      return nearby;
    var target = [
      "platform=" + platform,
      "arch=" + arch,
      "runtime=" + runtime,
      "abi=" + abi,
      "uv=" + uv,
      armv ? "armv=" + armv : "",
      "libc=" + libc,
      "node=" + process.versions.node,
      process.versions.electron ? "electron=" + process.versions.electron : "",
      typeof __webpack_require__ === "function" ? "webpack=true" : ""
    ].filter(Boolean).join(" ");
    throw new Error("No native build was found for " + target + `
    loaded from: ` + dir + `
`);
    function resolve(dir2) {
      var tuples = readdirSync(path.join(dir2, "prebuilds")).map(parseTuple);
      var tuple = tuples.filter(matchTuple(platform, arch)).sort(compareTuples)[0];
      if (!tuple)
        return;
      var prebuilds = path.join(dir2, "prebuilds", tuple.name);
      var parsed = readdirSync(prebuilds).map(parseTags);
      var candidates = parsed.filter(matchTags(runtime, abi));
      var winner = candidates.sort(compareTags(runtime))[0];
      if (winner)
        return path.join(prebuilds, winner.file);
    }
  };
  function readdirSync(dir) {
    try {
      return fs.readdirSync(dir);
    } catch (err) {
      return [];
    }
  }
  function getFirst(dir, filter2) {
    var files = readdirSync(dir).filter(filter2);
    return files[0] && path.join(dir, files[0]);
  }
  function matchBuild(name) {
    return /\.node$/.test(name);
  }
  function parseTuple(name) {
    var arr = name.split("-");
    if (arr.length !== 2)
      return;
    var platform2 = arr[0];
    var architectures = arr[1].split("+");
    if (!platform2)
      return;
    if (!architectures.length)
      return;
    if (!architectures.every(Boolean))
      return;
    return { name, platform: platform2, architectures };
  }
  function matchTuple(platform2, arch2) {
    return function(tuple) {
      if (tuple == null)
        return false;
      if (tuple.platform !== platform2)
        return false;
      return tuple.architectures.includes(arch2);
    };
  }
  function compareTuples(a, b) {
    return a.architectures.length - b.architectures.length;
  }
  function parseTags(file) {
    var arr = file.split(".");
    var extension = arr.pop();
    var tags = { file, specificity: 0 };
    if (extension !== "node")
      return;
    for (var i = 0;i < arr.length; i++) {
      var tag = arr[i];
      if (tag === "node" || tag === "electron" || tag === "node-webkit") {
        tags.runtime = tag;
      } else if (tag === "napi") {
        tags.napi = true;
      } else if (tag.slice(0, 3) === "abi") {
        tags.abi = tag.slice(3);
      } else if (tag.slice(0, 2) === "uv") {
        tags.uv = tag.slice(2);
      } else if (tag.slice(0, 4) === "armv") {
        tags.armv = tag.slice(4);
      } else if (tag === "glibc" || tag === "musl") {
        tags.libc = tag;
      } else {
        continue;
      }
      tags.specificity++;
    }
    return tags;
  }
  function matchTags(runtime2, abi2) {
    return function(tags) {
      if (tags == null)
        return false;
      if (tags.runtime && tags.runtime !== runtime2 && !runtimeAgnostic(tags))
        return false;
      if (tags.abi && tags.abi !== abi2 && !tags.napi)
        return false;
      if (tags.uv && tags.uv !== uv)
        return false;
      if (tags.armv && tags.armv !== armv)
        return false;
      if (tags.libc && tags.libc !== libc)
        return false;
      return true;
    };
  }
  function runtimeAgnostic(tags) {
    return tags.runtime === "node" && tags.napi;
  }
  function compareTags(runtime2) {
    return function(a, b) {
      if (a.runtime !== b.runtime) {
        return a.runtime === runtime2 ? -1 : 1;
      } else if (a.abi !== b.abi) {
        return a.abi ? -1 : 1;
      } else if (a.specificity !== b.specificity) {
        return a.specificity > b.specificity ? -1 : 1;
      } else {
        return 0;
      }
    };
  }
  function isNwjs() {
    return !!(process.versions && process.versions.nw);
  }
  function isElectron() {
    if (process.versions && process.versions.electron)
      return true;
    if (process.env.ELECTRON_RUN_AS_NODE)
      return true;
    return typeof window !== "undefined" && window.process && window.process.type === "renderer";
  }
  function isAlpine(platform2) {
    return platform2 === "linux" && fs.existsSync("/etc/alpine-release");
  }
  load.parseTags = parseTags;
  load.matchTags = matchTags;
  load.compareTags = compareTags;
  load.parseTuple = parseTuple;
  load.matchTuple = matchTuple;
  load.compareTuples = compareTuples;
});

// node_modules/node-gyp-build/index.js
var require_node_gyp_build2 = __commonJS((exports, module) => {
  var runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : __require;
  if (typeof runtimeRequire.addon === "function") {
    module.exports = runtimeRequire.addon.bind(runtimeRequire);
  } else {
    module.exports = require_node_gyp_build();
  }
});

// node_modules/bufferutil/fallback.js
var require_fallback = __commonJS((exports, module) => {
  var mask = (source, mask2, output, offset, length) => {
    for (var i = 0;i < length; i++) {
      output[offset + i] = source[i] ^ mask2[i & 3];
    }
  };
  var unmask = (buffer, mask2) => {
    const length = buffer.length;
    for (var i = 0;i < length; i++) {
      buffer[i] ^= mask2[i & 3];
    }
  };
  module.exports = { mask, unmask };
});

// node_modules/bufferutil/index.js
var require_bufferutil = __commonJS((exports, module) => {
  var __dirname = "/Users/boshi/Project/sideproject/polygon/node_modules/bufferutil";
  try {
    module.exports = require_node_gyp_build2()(__dirname);
  } catch (e) {
    module.exports = require_fallback();
  }
});

// node_modules/websocket/lib/WebSocketFrame.js
var require_WebSocketFrame = __commonJS((exports, module) => {
  var bufferUtil = require_bufferutil();
  var bufferAllocUnsafe = require_utils().bufferAllocUnsafe;
  var DECODE_HEADER = 1;
  var WAITING_FOR_16_BIT_LENGTH = 2;
  var WAITING_FOR_64_BIT_LENGTH = 3;
  var WAITING_FOR_MASK_KEY = 4;
  var WAITING_FOR_PAYLOAD = 5;
  var COMPLETE = 6;
  function WebSocketFrame(maskBytes, frameHeader, config) {
    this.maskBytes = maskBytes;
    this.frameHeader = frameHeader;
    this.config = config;
    this.maxReceivedFrameSize = config.maxReceivedFrameSize;
    this.protocolError = false;
    this.frameTooLarge = false;
    this.invalidCloseFrameLength = false;
    this.parseState = DECODE_HEADER;
    this.closeStatus = -1;
  }
  WebSocketFrame.prototype.addData = function(bufferList) {
    if (this.parseState === DECODE_HEADER) {
      if (bufferList.length >= 2) {
        bufferList.joinInto(this.frameHeader, 0, 0, 2);
        bufferList.advance(2);
        var firstByte = this.frameHeader[0];
        var secondByte = this.frameHeader[1];
        this.fin = Boolean(firstByte & 128);
        this.rsv1 = Boolean(firstByte & 64);
        this.rsv2 = Boolean(firstByte & 32);
        this.rsv3 = Boolean(firstByte & 16);
        this.mask = Boolean(secondByte & 128);
        this.opcode = firstByte & 15;
        this.length = secondByte & 127;
        if (this.opcode >= 8) {
          if (this.length > 125) {
            this.protocolError = true;
            this.dropReason = "Illegal control frame longer than 125 bytes.";
            return true;
          }
          if (!this.fin) {
            this.protocolError = true;
            this.dropReason = "Control frames must not be fragmented.";
            return true;
          }
        }
        if (this.length === 126) {
          this.parseState = WAITING_FOR_16_BIT_LENGTH;
        } else if (this.length === 127) {
          this.parseState = WAITING_FOR_64_BIT_LENGTH;
        } else {
          this.parseState = WAITING_FOR_MASK_KEY;
        }
      }
    }
    if (this.parseState === WAITING_FOR_16_BIT_LENGTH) {
      if (bufferList.length >= 2) {
        bufferList.joinInto(this.frameHeader, 2, 0, 2);
        bufferList.advance(2);
        this.length = this.frameHeader.readUInt16BE(2);
        this.parseState = WAITING_FOR_MASK_KEY;
      }
    } else if (this.parseState === WAITING_FOR_64_BIT_LENGTH) {
      if (bufferList.length >= 8) {
        bufferList.joinInto(this.frameHeader, 2, 0, 8);
        bufferList.advance(8);
        var lengthPair = [
          this.frameHeader.readUInt32BE(2),
          this.frameHeader.readUInt32BE(2 + 4)
        ];
        if (lengthPair[0] !== 0) {
          this.protocolError = true;
          this.dropReason = "Unsupported 64-bit length frame received";
          return true;
        }
        this.length = lengthPair[1];
        this.parseState = WAITING_FOR_MASK_KEY;
      }
    }
    if (this.parseState === WAITING_FOR_MASK_KEY) {
      if (this.mask) {
        if (bufferList.length >= 4) {
          bufferList.joinInto(this.maskBytes, 0, 0, 4);
          bufferList.advance(4);
          this.parseState = WAITING_FOR_PAYLOAD;
        }
      } else {
        this.parseState = WAITING_FOR_PAYLOAD;
      }
    }
    if (this.parseState === WAITING_FOR_PAYLOAD) {
      if (this.length > this.maxReceivedFrameSize) {
        this.frameTooLarge = true;
        this.dropReason = "Frame size of " + this.length.toString(10) + " bytes exceeds maximum accepted frame size";
        return true;
      }
      if (this.length === 0) {
        this.binaryPayload = bufferAllocUnsafe(0);
        this.parseState = COMPLETE;
        return true;
      }
      if (bufferList.length >= this.length) {
        this.binaryPayload = bufferList.take(this.length);
        bufferList.advance(this.length);
        if (this.mask) {
          bufferUtil.unmask(this.binaryPayload, this.maskBytes);
        }
        if (this.opcode === 8) {
          if (this.length === 1) {
            this.binaryPayload = bufferAllocUnsafe(0);
            this.invalidCloseFrameLength = true;
          }
          if (this.length >= 2) {
            this.closeStatus = this.binaryPayload.readUInt16BE(0);
            this.binaryPayload = this.binaryPayload.slice(2);
          }
        }
        this.parseState = COMPLETE;
        return true;
      }
    }
    return false;
  };
  WebSocketFrame.prototype.throwAwayPayload = function(bufferList) {
    if (bufferList.length >= this.length) {
      bufferList.advance(this.length);
      this.parseState = COMPLETE;
      return true;
    }
    return false;
  };
  WebSocketFrame.prototype.toBuffer = function(nullMask) {
    var maskKey;
    var headerLength = 2;
    var data;
    var outputPos;
    var firstByte = 0;
    var secondByte = 0;
    if (this.fin) {
      firstByte |= 128;
    }
    if (this.rsv1) {
      firstByte |= 64;
    }
    if (this.rsv2) {
      firstByte |= 32;
    }
    if (this.rsv3) {
      firstByte |= 16;
    }
    if (this.mask) {
      secondByte |= 128;
    }
    firstByte |= this.opcode & 15;
    if (this.opcode === 8) {
      this.length = 2;
      if (this.binaryPayload) {
        this.length += this.binaryPayload.length;
      }
      data = bufferAllocUnsafe(this.length);
      data.writeUInt16BE(this.closeStatus, 0);
      if (this.length > 2) {
        this.binaryPayload.copy(data, 2);
      }
    } else if (this.binaryPayload) {
      data = this.binaryPayload;
      this.length = data.length;
    } else {
      this.length = 0;
    }
    if (this.length <= 125) {
      secondByte |= this.length & 127;
    } else if (this.length > 125 && this.length <= 65535) {
      secondByte |= 126;
      headerLength += 2;
    } else if (this.length > 65535) {
      secondByte |= 127;
      headerLength += 8;
    }
    var output = bufferAllocUnsafe(this.length + headerLength + (this.mask ? 4 : 0));
    output[0] = firstByte;
    output[1] = secondByte;
    outputPos = 2;
    if (this.length > 125 && this.length <= 65535) {
      output.writeUInt16BE(this.length, outputPos);
      outputPos += 2;
    } else if (this.length > 65535) {
      output.writeUInt32BE(0, outputPos);
      output.writeUInt32BE(this.length, outputPos + 4);
      outputPos += 8;
    }
    if (this.mask) {
      maskKey = nullMask ? 0 : Math.random() * 4294967295 >>> 0;
      this.maskBytes.writeUInt32BE(maskKey, 0);
      this.maskBytes.copy(output, outputPos);
      outputPos += 4;
      if (data) {
        bufferUtil.mask(data, this.maskBytes, output, outputPos, this.length);
      }
    } else if (data) {
      data.copy(output, outputPos);
    }
    return output;
  };
  WebSocketFrame.prototype.toString = function() {
    return "Opcode: " + this.opcode + ", fin: " + this.fin + ", length: " + this.length + ", hasPayload: " + Boolean(this.binaryPayload) + ", masked: " + this.mask;
  };
  module.exports = WebSocketFrame;
});

// node_modules/websocket/vendor/FastBufferList.js
var require_FastBufferList = __commonJS((exports, module) => {
  var Buffer2 = __require("buffer").Buffer;
  var EventEmitter2 = __require("events").EventEmitter;
  var bufferAllocUnsafe = require_utils().bufferAllocUnsafe;
  module.exports = BufferList;
  module.exports.BufferList = BufferList;
  function BufferList(opts) {
    if (!(this instanceof BufferList))
      return new BufferList(opts);
    EventEmitter2.call(this);
    var self2 = this;
    if (typeof opts == "undefined")
      opts = {};
    self2.encoding = opts.encoding;
    var head = { next: null, buffer: null };
    var last = { next: null, buffer: null };
    var length = 0;
    self2.__defineGetter__("length", function() {
      return length;
    });
    var offset = 0;
    self2.write = function(buf) {
      if (!head.buffer) {
        head.buffer = buf;
        last = head;
      } else {
        last.next = { next: null, buffer: buf };
        last = last.next;
      }
      length += buf.length;
      self2.emit("write", buf);
      return true;
    };
    self2.end = function(buf) {
      if (Buffer2.isBuffer(buf))
        self2.write(buf);
    };
    self2.push = function() {
      var args = [].concat.apply([], arguments);
      args.forEach(self2.write);
      return self2;
    };
    self2.forEach = function(fn) {
      if (!head.buffer)
        return bufferAllocUnsafe(0);
      if (head.buffer.length - offset <= 0)
        return self2;
      var firstBuf = head.buffer.slice(offset);
      var b = { buffer: firstBuf, next: head.next };
      while (b && b.buffer) {
        var r = fn(b.buffer);
        if (r)
          break;
        b = b.next;
      }
      return self2;
    };
    self2.join = function(start, end) {
      if (!head.buffer)
        return bufferAllocUnsafe(0);
      if (start == undefined)
        start = 0;
      if (end == undefined)
        end = self2.length;
      var big = bufferAllocUnsafe(end - start);
      var ix = 0;
      self2.forEach(function(buffer) {
        if (start < ix + buffer.length && ix < end) {
          buffer.copy(big, Math.max(0, ix - start), Math.max(0, start - ix), Math.min(buffer.length, end - ix));
        }
        ix += buffer.length;
        if (ix > end)
          return true;
      });
      return big;
    };
    self2.joinInto = function(targetBuffer, targetStart, sourceStart, sourceEnd) {
      if (!head.buffer)
        return new bufferAllocUnsafe(0);
      if (sourceStart == undefined)
        sourceStart = 0;
      if (sourceEnd == undefined)
        sourceEnd = self2.length;
      var big = targetBuffer;
      if (big.length - targetStart < sourceEnd - sourceStart) {
        throw new Error("Insufficient space available in target Buffer.");
      }
      var ix = 0;
      self2.forEach(function(buffer) {
        if (sourceStart < ix + buffer.length && ix < sourceEnd) {
          buffer.copy(big, Math.max(targetStart, targetStart + ix - sourceStart), Math.max(0, sourceStart - ix), Math.min(buffer.length, sourceEnd - ix));
        }
        ix += buffer.length;
        if (ix > sourceEnd)
          return true;
      });
      return big;
    };
    self2.advance = function(n) {
      offset += n;
      length -= n;
      while (head.buffer && offset >= head.buffer.length) {
        offset -= head.buffer.length;
        head = head.next ? head.next : { buffer: null, next: null };
      }
      if (head.buffer === null)
        last = { next: null, buffer: null };
      self2.emit("advance", n);
      return self2;
    };
    self2.take = function(n, encoding) {
      if (n == undefined)
        n = self2.length;
      else if (typeof n !== "number") {
        encoding = n;
        n = self2.length;
      }
      var b = head;
      if (!encoding)
        encoding = self2.encoding;
      if (encoding) {
        var acc = "";
        self2.forEach(function(buffer) {
          if (n <= 0)
            return true;
          acc += buffer.toString(encoding, 0, Math.min(n, buffer.length));
          n -= buffer.length;
        });
        return acc;
      } else {
        return self2.join(0, n);
      }
    };
    self2.toString = function() {
      return self2.take("binary");
    };
  }
  __require("util").inherits(BufferList, EventEmitter2);
});

// node_modules/websocket/lib/WebSocketConnection.js
var require_WebSocketConnection = __commonJS((exports, module) => {
  var util3 = __require("util");
  var utils = require_utils();
  var EventEmitter2 = __require("events").EventEmitter;
  var WebSocketFrame = require_WebSocketFrame();
  var BufferList = require_FastBufferList();
  var isValidUTF8 = __require("utf-8-validate");
  var bufferAllocUnsafe = utils.bufferAllocUnsafe;
  var bufferFromString = utils.bufferFromString;
  var STATE_OPEN = "open";
  var STATE_PEER_REQUESTED_CLOSE = "peer_requested_close";
  var STATE_ENDING = "ending";
  var STATE_CLOSED = "closed";
  var setImmediateImpl = "setImmediate" in global ? global.setImmediate.bind(global) : process.nextTick.bind(process);
  var idCounter = 0;
  function WebSocketConnection(socket, extensions, protocol, maskOutgoingPackets, config) {
    this._debug = utils.BufferingLogger("websocket:connection", ++idCounter);
    this._debug("constructor");
    if (this._debug.enabled) {
      instrumentSocketForDebugging(this, socket);
    }
    EventEmitter2.call(this);
    this._pingListenerCount = 0;
    this.on("newListener", function(ev) {
      if (ev === "ping") {
        this._pingListenerCount++;
      }
    }).on("removeListener", function(ev) {
      if (ev === "ping") {
        this._pingListenerCount--;
      }
    });
    this.config = config;
    this.socket = socket;
    this.protocol = protocol;
    this.extensions = extensions;
    this.remoteAddress = socket.remoteAddress;
    this.closeReasonCode = -1;
    this.closeDescription = null;
    this.closeEventEmitted = false;
    this.maskOutgoingPackets = maskOutgoingPackets;
    this.maskBytes = bufferAllocUnsafe(4);
    this.frameHeader = bufferAllocUnsafe(10);
    this.bufferList = new BufferList;
    this.currentFrame = new WebSocketFrame(this.maskBytes, this.frameHeader, this.config);
    this.fragmentationSize = 0;
    this.frameQueue = [];
    this.connected = true;
    this.state = STATE_OPEN;
    this.waitingForCloseResponse = false;
    this.receivedEnd = false;
    this.closeTimeout = this.config.closeTimeout;
    this.assembleFragments = this.config.assembleFragments;
    this.maxReceivedMessageSize = this.config.maxReceivedMessageSize;
    this.outputBufferFull = false;
    this.inputPaused = false;
    this.receivedDataHandler = this.processReceivedData.bind(this);
    this._closeTimerHandler = this.handleCloseTimer.bind(this);
    this.socket.setNoDelay(this.config.disableNagleAlgorithm);
    this.socket.setTimeout(0);
    if (this.config.keepalive && !this.config.useNativeKeepalive) {
      if (typeof this.config.keepaliveInterval !== "number") {
        throw new Error("keepaliveInterval must be specified and numeric " + "if keepalive is true.");
      }
      this._keepaliveTimerHandler = this.handleKeepaliveTimer.bind(this);
      this.setKeepaliveTimer();
      if (this.config.dropConnectionOnKeepaliveTimeout) {
        if (typeof this.config.keepaliveGracePeriod !== "number") {
          throw new Error("keepaliveGracePeriod  must be specified and " + "numeric if dropConnectionOnKeepaliveTimeout " + "is true.");
        }
        this._gracePeriodTimerHandler = this.handleGracePeriodTimer.bind(this);
      }
    } else if (this.config.keepalive && this.config.useNativeKeepalive) {
      if (!("setKeepAlive" in this.socket)) {
        throw new Error("Unable to use native keepalive: unsupported by " + "this version of Node.");
      }
      this.socket.setKeepAlive(true, this.config.keepaliveInterval);
    }
    this.socket.removeAllListeners("error");
  }
  WebSocketConnection.CLOSE_REASON_NORMAL = 1000;
  WebSocketConnection.CLOSE_REASON_GOING_AWAY = 1001;
  WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR = 1002;
  WebSocketConnection.CLOSE_REASON_UNPROCESSABLE_INPUT = 1003;
  WebSocketConnection.CLOSE_REASON_RESERVED = 1004;
  WebSocketConnection.CLOSE_REASON_NOT_PROVIDED = 1005;
  WebSocketConnection.CLOSE_REASON_ABNORMAL = 1006;
  WebSocketConnection.CLOSE_REASON_INVALID_DATA = 1007;
  WebSocketConnection.CLOSE_REASON_POLICY_VIOLATION = 1008;
  WebSocketConnection.CLOSE_REASON_MESSAGE_TOO_BIG = 1009;
  WebSocketConnection.CLOSE_REASON_EXTENSION_REQUIRED = 1010;
  WebSocketConnection.CLOSE_REASON_INTERNAL_SERVER_ERROR = 1011;
  WebSocketConnection.CLOSE_REASON_TLS_HANDSHAKE_FAILED = 1015;
  WebSocketConnection.CLOSE_DESCRIPTIONS = {
    1000: "Normal connection closure",
    1001: "Remote peer is going away",
    1002: "Protocol error",
    1003: "Unprocessable input",
    1004: "Reserved",
    1005: "Reason not provided",
    1006: "Abnormal closure, no further detail available",
    1007: "Invalid data received",
    1008: "Policy violation",
    1009: "Message too big",
    1010: "Extension requested by client is required",
    1011: "Internal Server Error",
    1015: "TLS Handshake Failed"
  };
  function validateCloseReason(code) {
    if (code < 1000) {
      return false;
    }
    if (code >= 1000 && code <= 2999) {
      return [1000, 1001, 1002, 1003, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015].indexOf(code) !== -1;
    }
    if (code >= 3000 && code <= 3999) {
      return true;
    }
    if (code >= 4000 && code <= 4999) {
      return true;
    }
    if (code >= 5000) {
      return false;
    }
  }
  util3.inherits(WebSocketConnection, EventEmitter2);
  WebSocketConnection.prototype._addSocketEventListeners = function() {
    this.socket.on("error", this.handleSocketError.bind(this));
    this.socket.on("end", this.handleSocketEnd.bind(this));
    this.socket.on("close", this.handleSocketClose.bind(this));
    this.socket.on("drain", this.handleSocketDrain.bind(this));
    this.socket.on("pause", this.handleSocketPause.bind(this));
    this.socket.on("resume", this.handleSocketResume.bind(this));
    this.socket.on("data", this.handleSocketData.bind(this));
  };
  WebSocketConnection.prototype.setKeepaliveTimer = function() {
    this._debug("setKeepaliveTimer");
    if (!this.config.keepalive || this.config.useNativeKeepalive) {
      return;
    }
    this.clearKeepaliveTimer();
    this.clearGracePeriodTimer();
    this._keepaliveTimeoutID = setTimeout(this._keepaliveTimerHandler, this.config.keepaliveInterval);
  };
  WebSocketConnection.prototype.clearKeepaliveTimer = function() {
    if (this._keepaliveTimeoutID) {
      clearTimeout(this._keepaliveTimeoutID);
    }
  };
  WebSocketConnection.prototype.handleKeepaliveTimer = function() {
    this._debug("handleKeepaliveTimer");
    this._keepaliveTimeoutID = null;
    this.ping();
    if (this.config.dropConnectionOnKeepaliveTimeout) {
      this.setGracePeriodTimer();
    } else {
      this.setKeepaliveTimer();
    }
  };
  WebSocketConnection.prototype.setGracePeriodTimer = function() {
    this._debug("setGracePeriodTimer");
    this.clearGracePeriodTimer();
    this._gracePeriodTimeoutID = setTimeout(this._gracePeriodTimerHandler, this.config.keepaliveGracePeriod);
  };
  WebSocketConnection.prototype.clearGracePeriodTimer = function() {
    if (this._gracePeriodTimeoutID) {
      clearTimeout(this._gracePeriodTimeoutID);
    }
  };
  WebSocketConnection.prototype.handleGracePeriodTimer = function() {
    this._debug("handleGracePeriodTimer");
    this._gracePeriodTimeoutID = null;
    this.drop(WebSocketConnection.CLOSE_REASON_ABNORMAL, "Peer not responding.", true);
  };
  WebSocketConnection.prototype.handleSocketData = function(data) {
    this._debug("handleSocketData");
    this.setKeepaliveTimer();
    this.bufferList.write(data);
    this.processReceivedData();
  };
  WebSocketConnection.prototype.processReceivedData = function() {
    this._debug("processReceivedData");
    if (!this.connected) {
      return;
    }
    if (this.inputPaused) {
      return;
    }
    var frame = this.currentFrame;
    if (!frame.addData(this.bufferList)) {
      this._debug("-- insufficient data for frame");
      return;
    }
    var self2 = this;
    if (frame.protocolError) {
      this._debug("-- protocol error");
      process.nextTick(function() {
        self2.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR, frame.dropReason);
      });
      return;
    } else if (frame.frameTooLarge) {
      this._debug("-- frame too large");
      process.nextTick(function() {
        self2.drop(WebSocketConnection.CLOSE_REASON_MESSAGE_TOO_BIG, frame.dropReason);
      });
      return;
    }
    if (frame.rsv1 || frame.rsv2 || frame.rsv3) {
      this._debug("-- illegal rsv flag");
      process.nextTick(function() {
        self2.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR, "Unsupported usage of rsv bits without negotiated extension.");
      });
      return;
    }
    if (!this.assembleFragments) {
      this._debug("-- emitting frame");
      process.nextTick(function() {
        self2.emit("frame", frame);
      });
    }
    process.nextTick(function() {
      self2.processFrame(frame);
    });
    this.currentFrame = new WebSocketFrame(this.maskBytes, this.frameHeader, this.config);
    if (this.bufferList.length > 0) {
      setImmediateImpl(this.receivedDataHandler);
    }
  };
  WebSocketConnection.prototype.handleSocketError = function(error) {
    this._debug("handleSocketError: %j", error);
    if (this.state === STATE_CLOSED) {
      this._debug("  --- Socket 'error' after 'close'");
      return;
    }
    this.closeReasonCode = WebSocketConnection.CLOSE_REASON_ABNORMAL;
    this.closeDescription = "Socket Error: " + error.syscall + " " + error.code;
    this.connected = false;
    this.state = STATE_CLOSED;
    this.fragmentationSize = 0;
    if (utils.eventEmitterListenerCount(this, "error") > 0) {
      this.emit("error", error);
    }
    this.socket.destroy();
    this._debug.printOutput();
  };
  WebSocketConnection.prototype.handleSocketEnd = function() {
    this._debug("handleSocketEnd: received socket end.  state = %s", this.state);
    this.receivedEnd = true;
    if (this.state === STATE_CLOSED) {
      this._debug("  --- Socket 'end' after 'close'");
      return;
    }
    if (this.state !== STATE_PEER_REQUESTED_CLOSE && this.state !== STATE_ENDING) {
      this._debug("  --- UNEXPECTED socket end.");
      this.socket.end();
    }
  };
  WebSocketConnection.prototype.handleSocketClose = function(hadError) {
    this._debug("handleSocketClose: received socket close");
    this.socketHadError = hadError;
    this.connected = false;
    this.state = STATE_CLOSED;
    if (this.closeReasonCode === -1) {
      this.closeReasonCode = WebSocketConnection.CLOSE_REASON_ABNORMAL;
      this.closeDescription = "Connection dropped by remote peer.";
    }
    this.clearCloseTimer();
    this.clearKeepaliveTimer();
    this.clearGracePeriodTimer();
    if (!this.closeEventEmitted) {
      this.closeEventEmitted = true;
      this._debug("-- Emitting WebSocketConnection close event");
      this.emit("close", this.closeReasonCode, this.closeDescription);
    }
  };
  WebSocketConnection.prototype.handleSocketDrain = function() {
    this._debug("handleSocketDrain: socket drain event");
    this.outputBufferFull = false;
    this.emit("drain");
  };
  WebSocketConnection.prototype.handleSocketPause = function() {
    this._debug("handleSocketPause: socket pause event");
    this.inputPaused = true;
    this.emit("pause");
  };
  WebSocketConnection.prototype.handleSocketResume = function() {
    this._debug("handleSocketResume: socket resume event");
    this.inputPaused = false;
    this.emit("resume");
    this.processReceivedData();
  };
  WebSocketConnection.prototype.pause = function() {
    this._debug("pause: pause requested");
    this.socket.pause();
  };
  WebSocketConnection.prototype.resume = function() {
    this._debug("resume: resume requested");
    this.socket.resume();
  };
  WebSocketConnection.prototype.close = function(reasonCode, description) {
    if (this.connected) {
      this._debug("close: Initating clean WebSocket close sequence.");
      if (typeof reasonCode !== "number") {
        reasonCode = WebSocketConnection.CLOSE_REASON_NORMAL;
      }
      if (!validateCloseReason(reasonCode)) {
        throw new Error("Close code " + reasonCode + " is not valid.");
      }
      if (typeof description !== "string") {
        description = WebSocketConnection.CLOSE_DESCRIPTIONS[reasonCode];
      }
      this.closeReasonCode = reasonCode;
      this.closeDescription = description;
      this.setCloseTimer();
      this.sendCloseFrame(this.closeReasonCode, this.closeDescription);
      this.state = STATE_ENDING;
      this.connected = false;
    }
  };
  WebSocketConnection.prototype.drop = function(reasonCode, description, skipCloseFrame) {
    this._debug("drop");
    if (typeof reasonCode !== "number") {
      reasonCode = WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR;
    }
    if (typeof description !== "string") {
      description = WebSocketConnection.CLOSE_DESCRIPTIONS[reasonCode];
    }
    this._debug("Forcefully dropping connection. skipCloseFrame: %s, code: %d, description: %s", skipCloseFrame, reasonCode, description);
    this.closeReasonCode = reasonCode;
    this.closeDescription = description;
    this.frameQueue = [];
    this.fragmentationSize = 0;
    if (!skipCloseFrame) {
      this.sendCloseFrame(reasonCode, description);
    }
    this.connected = false;
    this.state = STATE_CLOSED;
    this.clearCloseTimer();
    this.clearKeepaliveTimer();
    this.clearGracePeriodTimer();
    if (!this.closeEventEmitted) {
      this.closeEventEmitted = true;
      this._debug("Emitting WebSocketConnection close event");
      this.emit("close", this.closeReasonCode, this.closeDescription);
    }
    this._debug("Drop: destroying socket");
    this.socket.destroy();
  };
  WebSocketConnection.prototype.setCloseTimer = function() {
    this._debug("setCloseTimer");
    this.clearCloseTimer();
    this._debug("Setting close timer");
    this.waitingForCloseResponse = true;
    this.closeTimer = setTimeout(this._closeTimerHandler, this.closeTimeout);
  };
  WebSocketConnection.prototype.clearCloseTimer = function() {
    this._debug("clearCloseTimer");
    if (this.closeTimer) {
      this._debug("Clearing close timer");
      clearTimeout(this.closeTimer);
      this.waitingForCloseResponse = false;
      this.closeTimer = null;
    }
  };
  WebSocketConnection.prototype.handleCloseTimer = function() {
    this._debug("handleCloseTimer");
    this.closeTimer = null;
    if (this.waitingForCloseResponse) {
      this._debug("Close response not received from client.  Forcing socket end.");
      this.waitingForCloseResponse = false;
      this.state = STATE_CLOSED;
      this.socket.end();
    }
  };
  WebSocketConnection.prototype.processFrame = function(frame) {
    this._debug("processFrame");
    this._debug(" -- frame: %s", frame);
    if (this.frameQueue.length !== 0 && (frame.opcode > 0 && frame.opcode < 8)) {
      this.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR, "Illegal frame opcode 0x" + frame.opcode.toString(16) + " " + "received in middle of fragmented message.");
      return;
    }
    switch (frame.opcode) {
      case 2:
        this._debug("-- Binary Frame");
        if (this.assembleFragments) {
          if (frame.fin) {
            this._debug("---- Emitting 'message' event");
            this.emit("message", {
              type: "binary",
              binaryData: frame.binaryPayload
            });
          } else {
            this.frameQueue.push(frame);
            this.fragmentationSize = frame.length;
          }
        }
        break;
      case 1:
        this._debug("-- Text Frame");
        if (this.assembleFragments) {
          if (frame.fin) {
            if (!isValidUTF8(frame.binaryPayload)) {
              this.drop(WebSocketConnection.CLOSE_REASON_INVALID_DATA, "Invalid UTF-8 Data Received");
              return;
            }
            this._debug("---- Emitting 'message' event");
            this.emit("message", {
              type: "utf8",
              utf8Data: frame.binaryPayload.toString("utf8")
            });
          } else {
            this.frameQueue.push(frame);
            this.fragmentationSize = frame.length;
          }
        }
        break;
      case 0:
        this._debug("-- Continuation Frame");
        if (this.assembleFragments) {
          if (this.frameQueue.length === 0) {
            this.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR, "Unexpected Continuation Frame");
            return;
          }
          this.fragmentationSize += frame.length;
          if (this.fragmentationSize > this.maxReceivedMessageSize) {
            this.drop(WebSocketConnection.CLOSE_REASON_MESSAGE_TOO_BIG, "Maximum message size exceeded.");
            return;
          }
          this.frameQueue.push(frame);
          if (frame.fin) {
            var bytesCopied = 0;
            var binaryPayload = bufferAllocUnsafe(this.fragmentationSize);
            var opcode = this.frameQueue[0].opcode;
            this.frameQueue.forEach(function(currentFrame) {
              currentFrame.binaryPayload.copy(binaryPayload, bytesCopied);
              bytesCopied += currentFrame.binaryPayload.length;
            });
            this.frameQueue = [];
            this.fragmentationSize = 0;
            switch (opcode) {
              case 2:
                this.emit("message", {
                  type: "binary",
                  binaryData: binaryPayload
                });
                break;
              case 1:
                if (!isValidUTF8(binaryPayload)) {
                  this.drop(WebSocketConnection.CLOSE_REASON_INVALID_DATA, "Invalid UTF-8 Data Received");
                  return;
                }
                this.emit("message", {
                  type: "utf8",
                  utf8Data: binaryPayload.toString("utf8")
                });
                break;
              default:
                this.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR, "Unexpected first opcode in fragmentation sequence: 0x" + opcode.toString(16));
                return;
            }
          }
        }
        break;
      case 9:
        this._debug("-- Ping Frame");
        if (this._pingListenerCount > 0) {
          var cancelled = false;
          var cancel = function() {
            cancelled = true;
          };
          this.emit("ping", cancel, frame.binaryPayload);
          if (!cancelled) {
            this.pong(frame.binaryPayload);
          }
        } else {
          this.pong(frame.binaryPayload);
        }
        break;
      case 10:
        this._debug("-- Pong Frame");
        this.emit("pong", frame.binaryPayload);
        break;
      case 8:
        this._debug("-- Close Frame");
        if (this.waitingForCloseResponse) {
          this._debug("---- Got close response from peer.  Completing closing handshake.");
          this.clearCloseTimer();
          this.waitingForCloseResponse = false;
          this.state = STATE_CLOSED;
          this.socket.end();
          return;
        }
        this._debug("---- Closing handshake initiated by peer.");
        this.state = STATE_PEER_REQUESTED_CLOSE;
        var respondCloseReasonCode;
        if (frame.invalidCloseFrameLength) {
          this.closeReasonCode = 1005;
          respondCloseReasonCode = WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR;
        } else if (frame.closeStatus === -1 || validateCloseReason(frame.closeStatus)) {
          this.closeReasonCode = frame.closeStatus;
          respondCloseReasonCode = WebSocketConnection.CLOSE_REASON_NORMAL;
        } else {
          this.closeReasonCode = frame.closeStatus;
          respondCloseReasonCode = WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR;
        }
        if (frame.binaryPayload.length > 1) {
          if (!isValidUTF8(frame.binaryPayload)) {
            this.drop(WebSocketConnection.CLOSE_REASON_INVALID_DATA, "Invalid UTF-8 Data Received");
            return;
          }
          this.closeDescription = frame.binaryPayload.toString("utf8");
        } else {
          this.closeDescription = WebSocketConnection.CLOSE_DESCRIPTIONS[this.closeReasonCode];
        }
        this._debug("------ Remote peer %s - code: %d - %s - close frame payload length: %d", this.remoteAddress, this.closeReasonCode, this.closeDescription, frame.length);
        this._debug("------ responding to remote peer's close request.");
        this.sendCloseFrame(respondCloseReasonCode, null);
        this.connected = false;
        break;
      default:
        this._debug("-- Unrecognized Opcode %d", frame.opcode);
        this.drop(WebSocketConnection.CLOSE_REASON_PROTOCOL_ERROR, "Unrecognized Opcode: 0x" + frame.opcode.toString(16));
        break;
    }
  };
  WebSocketConnection.prototype.send = function(data, cb) {
    this._debug("send");
    if (Buffer.isBuffer(data)) {
      this.sendBytes(data, cb);
    } else if (typeof data["toString"] === "function") {
      this.sendUTF(data, cb);
    } else {
      throw new Error("Data provided must either be a Node Buffer or implement toString()");
    }
  };
  WebSocketConnection.prototype.sendUTF = function(data, cb) {
    data = bufferFromString(data.toString(), "utf8");
    this._debug("sendUTF: %d bytes", data.length);
    var frame = new WebSocketFrame(this.maskBytes, this.frameHeader, this.config);
    frame.opcode = 1;
    frame.binaryPayload = data;
    this.fragmentAndSend(frame, cb);
  };
  WebSocketConnection.prototype.sendBytes = function(data, cb) {
    this._debug("sendBytes");
    if (!Buffer.isBuffer(data)) {
      throw new Error("You must pass a Node Buffer object to WebSocketConnection.prototype.sendBytes()");
    }
    var frame = new WebSocketFrame(this.maskBytes, this.frameHeader, this.config);
    frame.opcode = 2;
    frame.binaryPayload = data;
    this.fragmentAndSend(frame, cb);
  };
  WebSocketConnection.prototype.ping = function(data) {
    this._debug("ping");
    var frame = new WebSocketFrame(this.maskBytes, this.frameHeader, this.config);
    frame.opcode = 9;
    frame.fin = true;
    if (data) {
      if (!Buffer.isBuffer(data)) {
        data = bufferFromString(data.toString(), "utf8");
      }
      if (data.length > 125) {
        this._debug("WebSocket: Data for ping is longer than 125 bytes.  Truncating.");
        data = data.slice(0, 124);
      }
      frame.binaryPayload = data;
    }
    this.sendFrame(frame);
  };
  WebSocketConnection.prototype.pong = function(binaryPayload) {
    this._debug("pong");
    var frame = new WebSocketFrame(this.maskBytes, this.frameHeader, this.config);
    frame.opcode = 10;
    if (Buffer.isBuffer(binaryPayload) && binaryPayload.length > 125) {
      this._debug("WebSocket: Data for pong is longer than 125 bytes.  Truncating.");
      binaryPayload = binaryPayload.slice(0, 124);
    }
    frame.binaryPayload = binaryPayload;
    frame.fin = true;
    this.sendFrame(frame);
  };
  WebSocketConnection.prototype.fragmentAndSend = function(frame, cb) {
    this._debug("fragmentAndSend");
    if (frame.opcode > 7) {
      throw new Error("You cannot fragment control frames.");
    }
    var threshold = this.config.fragmentationThreshold;
    var length = frame.binaryPayload.length;
    if (!this.config.fragmentOutgoingMessages || frame.binaryPayload && length <= threshold) {
      frame.fin = true;
      this.sendFrame(frame, cb);
      return;
    }
    var numFragments = Math.ceil(length / threshold);
    var sentFragments = 0;
    var sentCallback = function fragmentSentCallback(err) {
      if (err) {
        if (typeof cb === "function") {
          cb(err);
          cb = null;
        }
        return;
      }
      ++sentFragments;
      if (sentFragments === numFragments && typeof cb === "function") {
        cb();
      }
    };
    for (var i = 1;i <= numFragments; i++) {
      var currentFrame = new WebSocketFrame(this.maskBytes, this.frameHeader, this.config);
      currentFrame.opcode = i === 1 ? frame.opcode : 0;
      currentFrame.fin = i === numFragments;
      var currentLength = i === numFragments ? length - threshold * (i - 1) : threshold;
      var sliceStart = threshold * (i - 1);
      currentFrame.binaryPayload = frame.binaryPayload.slice(sliceStart, sliceStart + currentLength);
      this.sendFrame(currentFrame, sentCallback);
    }
  };
  WebSocketConnection.prototype.sendCloseFrame = function(reasonCode, description, cb) {
    if (typeof reasonCode !== "number") {
      reasonCode = WebSocketConnection.CLOSE_REASON_NORMAL;
    }
    this._debug("sendCloseFrame state: %s, reasonCode: %d, description: %s", this.state, reasonCode, description);
    if (this.state !== STATE_OPEN && this.state !== STATE_PEER_REQUESTED_CLOSE) {
      return;
    }
    var frame = new WebSocketFrame(this.maskBytes, this.frameHeader, this.config);
    frame.fin = true;
    frame.opcode = 8;
    frame.closeStatus = reasonCode;
    if (typeof description === "string") {
      frame.binaryPayload = bufferFromString(description, "utf8");
    }
    this.sendFrame(frame, cb);
    this.socket.end();
  };
  WebSocketConnection.prototype.sendFrame = function(frame, cb) {
    this._debug("sendFrame");
    frame.mask = this.maskOutgoingPackets;
    var flushed = this.socket.write(frame.toBuffer(), cb);
    this.outputBufferFull = !flushed;
    return flushed;
  };
  module.exports = WebSocketConnection;
  function instrumentSocketForDebugging(connection, socket) {
    if (!connection._debug.enabled) {
      return;
    }
    var originalSocketEmit = socket.emit;
    socket.emit = function(event) {
      connection._debug("||| Socket Event  '%s'", event);
      originalSocketEmit.apply(this, arguments);
    };
    for (var key in socket) {
      if (typeof socket[key] !== "function") {
        continue;
      }
      if (["emit"].indexOf(key) !== -1) {
        continue;
      }
      (function(key2) {
        var original = socket[key2];
        if (key2 === "on") {
          socket[key2] = function proxyMethod__EventEmitter__On() {
            connection._debug("||| Socket method called:  %s (%s)", key2, arguments[0]);
            return original.apply(this, arguments);
          };
          return;
        }
        socket[key2] = function proxyMethod() {
          connection._debug("||| Socket method called:  %s", key2);
          return original.apply(this, arguments);
        };
      })(key);
    }
  }
});

// node_modules/websocket/lib/WebSocketRequest.js
var require_WebSocketRequest = __commonJS((exports, module) => {
  var crypto2 = __require("crypto");
  var util3 = __require("util");
  var url2 = __require("url");
  var EventEmitter2 = __require("events").EventEmitter;
  var WebSocketConnection = require_WebSocketConnection();
  var headerValueSplitRegExp = /,\s*/;
  var headerParamSplitRegExp = /;\s*/;
  var headerSanitizeRegExp = /[\r\n]/g;
  var xForwardedForSeparatorRegExp = /,\s*/;
  var separators = [
    "(",
    ")",
    "<",
    ">",
    "@",
    ",",
    ";",
    ":",
    "\\",
    '"',
    "/",
    "[",
    "]",
    "?",
    "=",
    "{",
    "}",
    " ",
    String.fromCharCode(9)
  ];
  var controlChars = [String.fromCharCode(127)];
  for (i = 0;i < 31; i++) {
    controlChars.push(String.fromCharCode(i));
  }
  var i;
  var cookieNameValidateRegEx = /([\x00-\x20\x22\x28\x29\x2c\x2f\x3a-\x3f\x40\x5b-\x5e\x7b\x7d\x7f])/;
  var cookieValueValidateRegEx = /[^\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]/;
  var cookieValueDQuoteValidateRegEx = /^"[^"]*"$/;
  var controlCharsAndSemicolonRegEx = /[\x00-\x20\x3b]/g;
  var cookieSeparatorRegEx = /[;,] */;
  var httpStatusDescriptions = {
    100: "Continue",
    101: "Switching Protocols",
    200: "OK",
    201: "Created",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    300: "Multiple Choices",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    406: "Not Acceptable",
    407: "Proxy Authorization Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Request Entity Too Long",
    414: "Request-URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested Range Not Satisfiable",
    417: "Expectation Failed",
    426: "Upgrade Required",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported"
  };
  function WebSocketRequest(socket, httpRequest, serverConfig) {
    EventEmitter2.call(this);
    this.socket = socket;
    this.httpRequest = httpRequest;
    this.resource = httpRequest.url;
    this.remoteAddress = socket.remoteAddress;
    this.remoteAddresses = [this.remoteAddress];
    this.serverConfig = serverConfig;
    this._socketIsClosing = false;
    this._socketCloseHandler = this._handleSocketCloseBeforeAccept.bind(this);
    this.socket.on("end", this._socketCloseHandler);
    this.socket.on("close", this._socketCloseHandler);
    this._resolved = false;
  }
  util3.inherits(WebSocketRequest, EventEmitter2);
  WebSocketRequest.prototype.readHandshake = function() {
    var self2 = this;
    var request = this.httpRequest;
    this.resourceURL = url2.parse(this.resource, true);
    this.host = request.headers["host"];
    if (!this.host) {
      throw new Error("Client must provide a Host header.");
    }
    this.key = request.headers["sec-websocket-key"];
    if (!this.key) {
      throw new Error("Client must provide a value for Sec-WebSocket-Key.");
    }
    this.webSocketVersion = parseInt(request.headers["sec-websocket-version"], 10);
    if (!this.webSocketVersion || isNaN(this.webSocketVersion)) {
      throw new Error("Client must provide a value for Sec-WebSocket-Version.");
    }
    switch (this.webSocketVersion) {
      case 8:
      case 13:
        break;
      default:
        var e = new Error("Unsupported websocket client version: " + this.webSocketVersion + "Only versions 8 and 13 are supported.");
        e.httpCode = 426;
        e.headers = {
          "Sec-WebSocket-Version": "13"
        };
        throw e;
    }
    if (this.webSocketVersion === 13) {
      this.origin = request.headers["origin"];
    } else if (this.webSocketVersion === 8) {
      this.origin = request.headers["sec-websocket-origin"];
    }
    var protocolString = request.headers["sec-websocket-protocol"];
    this.protocolFullCaseMap = {};
    this.requestedProtocols = [];
    if (protocolString) {
      var requestedProtocolsFullCase = protocolString.split(headerValueSplitRegExp);
      requestedProtocolsFullCase.forEach(function(protocol) {
        var lcProtocol = protocol.toLocaleLowerCase();
        self2.requestedProtocols.push(lcProtocol);
        self2.protocolFullCaseMap[lcProtocol] = protocol;
      });
    }
    if (!this.serverConfig.ignoreXForwardedFor && request.headers["x-forwarded-for"]) {
      var immediatePeerIP = this.remoteAddress;
      this.remoteAddresses = request.headers["x-forwarded-for"].split(xForwardedForSeparatorRegExp);
      this.remoteAddresses.push(immediatePeerIP);
      this.remoteAddress = this.remoteAddresses[0];
    }
    if (this.serverConfig.parseExtensions) {
      var extensionsString = request.headers["sec-websocket-extensions"];
      this.requestedExtensions = this.parseExtensions(extensionsString);
    } else {
      this.requestedExtensions = [];
    }
    if (this.serverConfig.parseCookies) {
      var cookieString = request.headers["cookie"];
      this.cookies = this.parseCookies(cookieString);
    } else {
      this.cookies = [];
    }
  };
  WebSocketRequest.prototype.parseExtensions = function(extensionsString) {
    if (!extensionsString || extensionsString.length === 0) {
      return [];
    }
    var extensions = extensionsString.toLocaleLowerCase().split(headerValueSplitRegExp);
    extensions.forEach(function(extension, index, array) {
      var params = extension.split(headerParamSplitRegExp);
      var extensionName = params[0];
      var extensionParams = params.slice(1);
      extensionParams.forEach(function(rawParam, index2, array2) {
        var arr = rawParam.split("=");
        var obj2 = {
          name: arr[0],
          value: arr[1]
        };
        array2.splice(index2, 1, obj2);
      });
      var obj = {
        name: extensionName,
        params: extensionParams
      };
      array.splice(index, 1, obj);
    });
    return extensions;
  };
  WebSocketRequest.prototype.parseCookies = function(str) {
    if (!str || typeof str !== "string") {
      return [];
    }
    var cookies = [];
    var pairs = str.split(cookieSeparatorRegEx);
    pairs.forEach(function(pair) {
      var eq_idx = pair.indexOf("=");
      if (eq_idx === -1) {
        cookies.push({
          name: pair,
          value: null
        });
        return;
      }
      var key = pair.substr(0, eq_idx).trim();
      var val = pair.substr(++eq_idx, pair.length).trim();
      if (val[0] === '"') {
        val = val.slice(1, -1);
      }
      cookies.push({
        name: key,
        value: decodeURIComponent(val)
      });
    });
    return cookies;
  };
  WebSocketRequest.prototype.accept = function(acceptedProtocol, allowedOrigin, cookies) {
    this._verifyResolution();
    var protocolFullCase;
    if (acceptedProtocol) {
      protocolFullCase = this.protocolFullCaseMap[acceptedProtocol.toLocaleLowerCase()];
      if (typeof protocolFullCase === "undefined") {
        protocolFullCase = acceptedProtocol;
      }
    } else {
      protocolFullCase = acceptedProtocol;
    }
    this.protocolFullCaseMap = null;
    var sha1 = crypto2.createHash("sha1");
    sha1.update(this.key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
    var acceptKey = sha1.digest("base64");
    var response = `HTTP/1.1 101 Switching Protocols\r
` + `Upgrade: websocket\r
` + `Connection: Upgrade\r
` + "Sec-WebSocket-Accept: " + acceptKey + `\r
`;
    if (protocolFullCase) {
      for (var i2 = 0;i2 < protocolFullCase.length; i2++) {
        var charCode = protocolFullCase.charCodeAt(i2);
        var character = protocolFullCase.charAt(i2);
        if (charCode < 33 || charCode > 126 || separators.indexOf(character) !== -1) {
          this.reject(500);
          throw new Error('Illegal character "' + String.fromCharCode(character) + '" in subprotocol.');
        }
      }
      if (this.requestedProtocols.indexOf(acceptedProtocol) === -1) {
        this.reject(500);
        throw new Error("Specified protocol was not requested by the client.");
      }
      protocolFullCase = protocolFullCase.replace(headerSanitizeRegExp, "");
      response += "Sec-WebSocket-Protocol: " + protocolFullCase + `\r
`;
    }
    this.requestedProtocols = null;
    if (allowedOrigin) {
      allowedOrigin = allowedOrigin.replace(headerSanitizeRegExp, "");
      if (this.webSocketVersion === 13) {
        response += "Origin: " + allowedOrigin + `\r
`;
      } else if (this.webSocketVersion === 8) {
        response += "Sec-WebSocket-Origin: " + allowedOrigin + `\r
`;
      }
    }
    if (cookies) {
      if (!Array.isArray(cookies)) {
        this.reject(500);
        throw new Error('Value supplied for "cookies" argument must be an array.');
      }
      var seenCookies = {};
      cookies.forEach(function(cookie) {
        if (!cookie.name || !cookie.value) {
          this.reject(500);
          throw new Error('Each cookie to set must at least provide a "name" and "value"');
        }
        cookie.name = cookie.name.replace(controlCharsAndSemicolonRegEx, "");
        cookie.value = cookie.value.replace(controlCharsAndSemicolonRegEx, "");
        if (seenCookies[cookie.name]) {
          this.reject(500);
          throw new Error("You may not specify the same cookie name twice.");
        }
        seenCookies[cookie.name] = true;
        var invalidChar = cookie.name.match(cookieNameValidateRegEx);
        if (invalidChar) {
          this.reject(500);
          throw new Error("Illegal character " + invalidChar[0] + " in cookie name");
        }
        if (cookie.value.match(cookieValueDQuoteValidateRegEx)) {
          invalidChar = cookie.value.slice(1, -1).match(cookieValueValidateRegEx);
        } else {
          invalidChar = cookie.value.match(cookieValueValidateRegEx);
        }
        if (invalidChar) {
          this.reject(500);
          throw new Error("Illegal character " + invalidChar[0] + " in cookie value");
        }
        var cookieParts = [cookie.name + "=" + cookie.value];
        if (cookie.path) {
          invalidChar = cookie.path.match(controlCharsAndSemicolonRegEx);
          if (invalidChar) {
            this.reject(500);
            throw new Error("Illegal character " + invalidChar[0] + " in cookie path");
          }
          cookieParts.push("Path=" + cookie.path);
        }
        if (cookie.domain) {
          if (typeof cookie.domain !== "string") {
            this.reject(500);
            throw new Error("Domain must be specified and must be a string.");
          }
          invalidChar = cookie.domain.match(controlCharsAndSemicolonRegEx);
          if (invalidChar) {
            this.reject(500);
            throw new Error("Illegal character " + invalidChar[0] + " in cookie domain");
          }
          cookieParts.push("Domain=" + cookie.domain.toLowerCase());
        }
        if (cookie.expires) {
          if (!(cookie.expires instanceof Date)) {
            this.reject(500);
            throw new Error('Value supplied for cookie "expires" must be a vaild date object');
          }
          cookieParts.push("Expires=" + cookie.expires.toGMTString());
        }
        if (cookie.maxage) {
          var maxage = cookie.maxage;
          if (typeof maxage === "string") {
            maxage = parseInt(maxage, 10);
          }
          if (isNaN(maxage) || maxage <= 0) {
            this.reject(500);
            throw new Error('Value supplied for cookie "maxage" must be a non-zero number');
          }
          maxage = Math.round(maxage);
          cookieParts.push("Max-Age=" + maxage.toString(10));
        }
        if (cookie.secure) {
          if (typeof cookie.secure !== "boolean") {
            this.reject(500);
            throw new Error('Value supplied for cookie "secure" must be of type boolean');
          }
          cookieParts.push("Secure");
        }
        if (cookie.httponly) {
          if (typeof cookie.httponly !== "boolean") {
            this.reject(500);
            throw new Error('Value supplied for cookie "httponly" must be of type boolean');
          }
          cookieParts.push("HttpOnly");
        }
        response += "Set-Cookie: " + cookieParts.join(";") + `\r
`;
      }.bind(this));
    }
    this._resolved = true;
    this.emit("requestResolved", this);
    response += `\r
`;
    var connection = new WebSocketConnection(this.socket, [], acceptedProtocol, false, this.serverConfig);
    connection.webSocketVersion = this.webSocketVersion;
    connection.remoteAddress = this.remoteAddress;
    connection.remoteAddresses = this.remoteAddresses;
    var self2 = this;
    if (this._socketIsClosing) {
      cleanupFailedConnection(connection);
    } else {
      this.socket.write(response, "ascii", function(error) {
        if (error) {
          cleanupFailedConnection(connection);
          return;
        }
        self2._removeSocketCloseListeners();
        connection._addSocketEventListeners();
      });
    }
    this.emit("requestAccepted", connection);
    return connection;
  };
  WebSocketRequest.prototype.reject = function(status, reason, extraHeaders) {
    this._verifyResolution();
    this._resolved = true;
    this.emit("requestResolved", this);
    if (typeof status !== "number") {
      status = 403;
    }
    var response = "HTTP/1.1 " + status + " " + httpStatusDescriptions[status] + `\r
` + `Connection: close\r
`;
    if (reason) {
      reason = reason.replace(headerSanitizeRegExp, "");
      response += "X-WebSocket-Reject-Reason: " + reason + `\r
`;
    }
    if (extraHeaders) {
      for (var key in extraHeaders) {
        var sanitizedValue = extraHeaders[key].toString().replace(headerSanitizeRegExp, "");
        var sanitizedKey = key.replace(headerSanitizeRegExp, "");
        response += sanitizedKey + ": " + sanitizedValue + `\r
`;
      }
    }
    response += `\r
`;
    this.socket.end(response, "ascii");
    this.emit("requestRejected", this);
  };
  WebSocketRequest.prototype._handleSocketCloseBeforeAccept = function() {
    this._socketIsClosing = true;
    this._removeSocketCloseListeners();
  };
  WebSocketRequest.prototype._removeSocketCloseListeners = function() {
    this.socket.removeListener("end", this._socketCloseHandler);
    this.socket.removeListener("close", this._socketCloseHandler);
  };
  WebSocketRequest.prototype._verifyResolution = function() {
    if (this._resolved) {
      throw new Error("WebSocketRequest may only be accepted or rejected one time.");
    }
  };
  function cleanupFailedConnection(connection) {
    process.nextTick(function() {
      connection.drop(1006, "TCP connection lost before handshake completed.", true);
    });
  }
  module.exports = WebSocketRequest;
});

// node_modules/websocket/lib/WebSocketServer.js
var require_WebSocketServer = __commonJS((exports, module) => {
  var extend2 = require_utils().extend;
  var utils = require_utils();
  var util3 = __require("util");
  var debug = require_src()("websocket:server");
  var EventEmitter2 = __require("events").EventEmitter;
  var WebSocketRequest = require_WebSocketRequest();
  var WebSocketServer = function WebSocketServer2(config) {
    EventEmitter2.call(this);
    this._handlers = {
      upgrade: this.handleUpgrade.bind(this),
      requestAccepted: this.handleRequestAccepted.bind(this),
      requestResolved: this.handleRequestResolved.bind(this)
    };
    this.connections = [];
    this.pendingRequests = [];
    if (config) {
      this.mount(config);
    }
  };
  util3.inherits(WebSocketServer, EventEmitter2);
  WebSocketServer.prototype.mount = function(config) {
    this.config = {
      httpServer: null,
      maxReceivedFrameSize: 65536,
      maxReceivedMessageSize: 1048576,
      fragmentOutgoingMessages: true,
      fragmentationThreshold: 16384,
      keepalive: true,
      keepaliveInterval: 20000,
      dropConnectionOnKeepaliveTimeout: true,
      keepaliveGracePeriod: 1e4,
      useNativeKeepalive: false,
      assembleFragments: true,
      autoAcceptConnections: false,
      ignoreXForwardedFor: false,
      parseCookies: true,
      parseExtensions: true,
      disableNagleAlgorithm: true,
      closeTimeout: 5000
    };
    extend2(this.config, config);
    if (this.config.httpServer) {
      if (!Array.isArray(this.config.httpServer)) {
        this.config.httpServer = [this.config.httpServer];
      }
      var upgradeHandler = this._handlers.upgrade;
      this.config.httpServer.forEach(function(httpServer) {
        httpServer.on("upgrade", upgradeHandler);
      });
    } else {
      throw new Error("You must specify an httpServer on which to mount the WebSocket server.");
    }
  };
  WebSocketServer.prototype.unmount = function() {
    var upgradeHandler = this._handlers.upgrade;
    this.config.httpServer.forEach(function(httpServer) {
      httpServer.removeListener("upgrade", upgradeHandler);
    });
  };
  WebSocketServer.prototype.closeAllConnections = function() {
    this.connections.forEach(function(connection) {
      connection.close();
    });
    this.pendingRequests.forEach(function(request) {
      process.nextTick(function() {
        request.reject(503);
      });
    });
  };
  WebSocketServer.prototype.broadcast = function(data) {
    if (Buffer.isBuffer(data)) {
      this.broadcastBytes(data);
    } else if (typeof data.toString === "function") {
      this.broadcastUTF(data);
    }
  };
  WebSocketServer.prototype.broadcastUTF = function(utfData) {
    this.connections.forEach(function(connection) {
      connection.sendUTF(utfData);
    });
  };
  WebSocketServer.prototype.broadcastBytes = function(binaryData) {
    this.connections.forEach(function(connection) {
      connection.sendBytes(binaryData);
    });
  };
  WebSocketServer.prototype.shutDown = function() {
    this.unmount();
    this.closeAllConnections();
  };
  WebSocketServer.prototype.handleUpgrade = function(request, socket) {
    var self2 = this;
    var wsRequest = new WebSocketRequest(socket, request, this.config);
    try {
      wsRequest.readHandshake();
    } catch (e) {
      wsRequest.reject(e.httpCode ? e.httpCode : 400, e.message, e.headers);
      debug("Invalid handshake: %s", e.message);
      this.emit("upgradeError", e);
      return;
    }
    this.pendingRequests.push(wsRequest);
    wsRequest.once("requestAccepted", this._handlers.requestAccepted);
    wsRequest.once("requestResolved", this._handlers.requestResolved);
    socket.once("close", function() {
      self2._handlers.requestResolved(wsRequest);
    });
    if (!this.config.autoAcceptConnections && utils.eventEmitterListenerCount(this, "request") > 0) {
      this.emit("request", wsRequest);
    } else if (this.config.autoAcceptConnections) {
      wsRequest.accept(wsRequest.requestedProtocols[0], wsRequest.origin);
    } else {
      wsRequest.reject(404, "No handler is configured to accept the connection.");
    }
  };
  WebSocketServer.prototype.handleRequestAccepted = function(connection) {
    var self2 = this;
    connection.once("close", function(closeReason, description) {
      self2.handleConnectionClose(connection, closeReason, description);
    });
    this.connections.push(connection);
    this.emit("connect", connection);
  };
  WebSocketServer.prototype.handleConnectionClose = function(connection, closeReason, description) {
    var index = this.connections.indexOf(connection);
    if (index !== -1) {
      this.connections.splice(index, 1);
    }
    this.emit("close", connection, closeReason, description);
  };
  WebSocketServer.prototype.handleRequestResolved = function(request) {
    var index = this.pendingRequests.indexOf(request);
    if (index !== -1) {
      this.pendingRequests.splice(index, 1);
    }
  };
  module.exports = WebSocketServer;
});

// node_modules/websocket/lib/WebSocketClient.js
var require_WebSocketClient = __commonJS((exports, module) => {
  var utils = require_utils();
  var extend2 = utils.extend;
  var util3 = __require("util");
  var EventEmitter2 = __require("events").EventEmitter;
  var http3 = __require("http");
  var https2 = __require("https");
  var url2 = __require("url");
  var crypto2 = __require("crypto");
  var WebSocketConnection = require_WebSocketConnection();
  var bufferAllocUnsafe = utils.bufferAllocUnsafe;
  var protocolSeparators = [
    "(",
    ")",
    "<",
    ">",
    "@",
    ",",
    ";",
    ":",
    "\\",
    '"',
    "/",
    "[",
    "]",
    "?",
    "=",
    "{",
    "}",
    " ",
    String.fromCharCode(9)
  ];
  var excludedTlsOptions = ["hostname", "port", "method", "path", "headers"];
  function WebSocketClient(config) {
    EventEmitter2.call(this);
    this.config = {
      maxReceivedFrameSize: 1048576,
      maxReceivedMessageSize: 8388608,
      fragmentOutgoingMessages: true,
      fragmentationThreshold: 16384,
      webSocketVersion: 13,
      assembleFragments: true,
      disableNagleAlgorithm: true,
      closeTimeout: 5000,
      tlsOptions: {}
    };
    if (config) {
      var tlsOptions;
      if (config.tlsOptions) {
        tlsOptions = config.tlsOptions;
        delete config.tlsOptions;
      } else {
        tlsOptions = {};
      }
      extend2(this.config, config);
      extend2(this.config.tlsOptions, tlsOptions);
    }
    this._req = null;
    switch (this.config.webSocketVersion) {
      case 8:
      case 13:
        break;
      default:
        throw new Error("Requested webSocketVersion is not supported. Allowed values are 8 and 13.");
    }
  }
  util3.inherits(WebSocketClient, EventEmitter2);
  WebSocketClient.prototype.connect = function(requestUrl, protocols, origin2, headers, extraRequestOptions) {
    var self2 = this;
    if (typeof protocols === "string") {
      if (protocols.length > 0) {
        protocols = [protocols];
      } else {
        protocols = [];
      }
    }
    if (!(protocols instanceof Array)) {
      protocols = [];
    }
    this.protocols = protocols;
    this.origin = origin2;
    if (typeof requestUrl === "string") {
      this.url = url2.parse(requestUrl);
    } else {
      this.url = requestUrl;
    }
    if (!this.url.protocol) {
      throw new Error("You must specify a full WebSocket URL, including protocol.");
    }
    if (!this.url.host) {
      throw new Error("You must specify a full WebSocket URL, including hostname. Relative URLs are not supported.");
    }
    this.secure = this.url.protocol === "wss:";
    this.protocols.forEach(function(protocol) {
      for (var i2 = 0;i2 < protocol.length; i2++) {
        var charCode = protocol.charCodeAt(i2);
        var character = protocol.charAt(i2);
        if (charCode < 33 || charCode > 126 || protocolSeparators.indexOf(character) !== -1) {
          throw new Error('Protocol list contains invalid character "' + String.fromCharCode(charCode) + '"');
        }
      }
    });
    var defaultPorts = {
      "ws:": "80",
      "wss:": "443"
    };
    if (!this.url.port) {
      this.url.port = defaultPorts[this.url.protocol];
    }
    var nonce = bufferAllocUnsafe(16);
    for (var i = 0;i < 16; i++) {
      nonce[i] = Math.round(Math.random() * 255);
    }
    this.base64nonce = nonce.toString("base64");
    var hostHeaderValue = this.url.hostname;
    if (this.url.protocol === "ws:" && this.url.port !== "80" || this.url.protocol === "wss:" && this.url.port !== "443") {
      hostHeaderValue += ":" + this.url.port;
    }
    var reqHeaders = {};
    if (this.secure && this.config.tlsOptions.hasOwnProperty("headers")) {
      extend2(reqHeaders, this.config.tlsOptions.headers);
    }
    if (headers) {
      extend2(reqHeaders, headers);
    }
    extend2(reqHeaders, {
      Upgrade: "websocket",
      Connection: "Upgrade",
      "Sec-WebSocket-Version": this.config.webSocketVersion.toString(10),
      "Sec-WebSocket-Key": this.base64nonce,
      Host: reqHeaders.Host || hostHeaderValue
    });
    if (this.protocols.length > 0) {
      reqHeaders["Sec-WebSocket-Protocol"] = this.protocols.join(", ");
    }
    if (this.origin) {
      if (this.config.webSocketVersion === 13) {
        reqHeaders["Origin"] = this.origin;
      } else if (this.config.webSocketVersion === 8) {
        reqHeaders["Sec-WebSocket-Origin"] = this.origin;
      }
    }
    var pathAndQuery;
    if (this.url.pathname) {
      pathAndQuery = this.url.path;
    } else if (this.url.path) {
      pathAndQuery = "/" + this.url.path;
    } else {
      pathAndQuery = "/";
    }
    function handleRequestError(error) {
      self2._req = null;
      self2.emit("connectFailed", error);
    }
    var requestOptions = {
      agent: false
    };
    if (extraRequestOptions) {
      extend2(requestOptions, extraRequestOptions);
    }
    extend2(requestOptions, {
      hostname: this.url.hostname,
      port: this.url.port,
      method: "GET",
      path: pathAndQuery,
      headers: reqHeaders
    });
    if (this.secure) {
      var tlsOptions = this.config.tlsOptions;
      for (var key in tlsOptions) {
        if (tlsOptions.hasOwnProperty(key) && excludedTlsOptions.indexOf(key) === -1) {
          requestOptions[key] = tlsOptions[key];
        }
      }
    }
    var req = this._req = (this.secure ? https2 : http3).request(requestOptions);
    req.on("upgrade", function handleRequestUpgrade(response, socket, head) {
      self2._req = null;
      req.removeListener("error", handleRequestError);
      self2.socket = socket;
      self2.response = response;
      self2.firstDataChunk = head;
      self2.validateHandshake();
    });
    req.on("error", handleRequestError);
    req.on("response", function(response) {
      self2._req = null;
      if (utils.eventEmitterListenerCount(self2, "httpResponse") > 0) {
        self2.emit("httpResponse", response, self2);
        if (response.socket) {
          response.socket.end();
        }
      } else {
        var headerDumpParts = [];
        for (var headerName in response.headers) {
          headerDumpParts.push(headerName + ": " + response.headers[headerName]);
        }
        self2.failHandshake("Server responded with a non-101 status: " + response.statusCode + " " + response.statusMessage + `
Response Headers Follow:
` + headerDumpParts.join(`
`) + `
`);
      }
    });
    req.end();
  };
  WebSocketClient.prototype.validateHandshake = function() {
    var headers = this.response.headers;
    if (this.protocols.length > 0) {
      this.protocol = headers["sec-websocket-protocol"];
      if (this.protocol) {
        if (this.protocols.indexOf(this.protocol) === -1) {
          this.failHandshake("Server did not respond with a requested protocol.");
          return;
        }
      } else {
        this.failHandshake("Expected a Sec-WebSocket-Protocol header.");
        return;
      }
    }
    if (!(headers["connection"] && headers["connection"].toLocaleLowerCase() === "upgrade")) {
      this.failHandshake("Expected a Connection: Upgrade header from the server");
      return;
    }
    if (!(headers["upgrade"] && headers["upgrade"].toLocaleLowerCase() === "websocket")) {
      this.failHandshake("Expected an Upgrade: websocket header from the server");
      return;
    }
    var sha1 = crypto2.createHash("sha1");
    sha1.update(this.base64nonce + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
    var expectedKey = sha1.digest("base64");
    if (!headers["sec-websocket-accept"]) {
      this.failHandshake("Expected Sec-WebSocket-Accept header from server");
      return;
    }
    if (headers["sec-websocket-accept"] !== expectedKey) {
      this.failHandshake("Sec-WebSocket-Accept header from server didn't match expected value of " + expectedKey);
      return;
    }
    this.succeedHandshake();
  };
  WebSocketClient.prototype.failHandshake = function(errorDescription) {
    if (this.socket && this.socket.writable) {
      this.socket.end();
    }
    this.emit("connectFailed", new Error(errorDescription));
  };
  WebSocketClient.prototype.succeedHandshake = function() {
    var connection = new WebSocketConnection(this.socket, [], this.protocol, true, this.config);
    connection.webSocketVersion = this.config.webSocketVersion;
    connection._addSocketEventListeners();
    this.emit("connect", connection);
    if (this.firstDataChunk.length > 0) {
      connection.handleSocketData(this.firstDataChunk);
    }
    this.firstDataChunk = null;
  };
  WebSocketClient.prototype.abort = function() {
    if (this._req) {
      this._req.abort();
    }
  };
  module.exports = WebSocketClient;
});

// node_modules/websocket/lib/WebSocketRouterRequest.js
var require_WebSocketRouterRequest = __commonJS((exports, module) => {
  var util3 = __require("util");
  var EventEmitter2 = __require("events").EventEmitter;
  function WebSocketRouterRequest(webSocketRequest, resolvedProtocol) {
    EventEmitter2.call(this);
    this.webSocketRequest = webSocketRequest;
    if (resolvedProtocol === "____no_protocol____") {
      this.protocol = null;
    } else {
      this.protocol = resolvedProtocol;
    }
    this.origin = webSocketRequest.origin;
    this.resource = webSocketRequest.resource;
    this.resourceURL = webSocketRequest.resourceURL;
    this.httpRequest = webSocketRequest.httpRequest;
    this.remoteAddress = webSocketRequest.remoteAddress;
    this.webSocketVersion = webSocketRequest.webSocketVersion;
    this.requestedExtensions = webSocketRequest.requestedExtensions;
    this.cookies = webSocketRequest.cookies;
  }
  util3.inherits(WebSocketRouterRequest, EventEmitter2);
  WebSocketRouterRequest.prototype.accept = function(origin2, cookies) {
    var connection = this.webSocketRequest.accept(this.protocol, origin2, cookies);
    this.emit("requestAccepted", connection);
    return connection;
  };
  WebSocketRouterRequest.prototype.reject = function(status, reason, extraHeaders) {
    this.webSocketRequest.reject(status, reason, extraHeaders);
    this.emit("requestRejected", this);
  };
  module.exports = WebSocketRouterRequest;
});

// node_modules/websocket/lib/WebSocketRouter.js
var require_WebSocketRouter = __commonJS((exports, module) => {
  var extend2 = require_utils().extend;
  var util3 = __require("util");
  var EventEmitter2 = __require("events").EventEmitter;
  var WebSocketRouterRequest = require_WebSocketRouterRequest();
  function WebSocketRouter(config) {
    EventEmitter2.call(this);
    this.config = {
      server: null
    };
    if (config) {
      extend2(this.config, config);
    }
    this.handlers = [];
    this._requestHandler = this.handleRequest.bind(this);
    if (this.config.server) {
      this.attachServer(this.config.server);
    }
  }
  util3.inherits(WebSocketRouter, EventEmitter2);
  WebSocketRouter.prototype.attachServer = function(server) {
    if (server) {
      this.server = server;
      this.server.on("request", this._requestHandler);
    } else {
      throw new Error("You must specify a WebSocketServer instance to attach to.");
    }
  };
  WebSocketRouter.prototype.detachServer = function() {
    if (this.server) {
      this.server.removeListener("request", this._requestHandler);
      this.server = null;
    } else {
      throw new Error("Cannot detach from server: not attached.");
    }
  };
  WebSocketRouter.prototype.mount = function(path, protocol, callback) {
    if (!path) {
      throw new Error("You must specify a path for this handler.");
    }
    if (!protocol) {
      protocol = "____no_protocol____";
    }
    if (!callback) {
      throw new Error("You must specify a callback for this handler.");
    }
    path = this.pathToRegExp(path);
    if (!(path instanceof RegExp)) {
      throw new Error("Path must be specified as either a string or a RegExp.");
    }
    var pathString = path.toString();
    protocol = protocol.toLocaleLowerCase();
    if (this.findHandlerIndex(pathString, protocol) !== -1) {
      throw new Error("You may only mount one handler per path/protocol combination.");
    }
    this.handlers.push({
      path,
      pathString,
      protocol,
      callback
    });
  };
  WebSocketRouter.prototype.unmount = function(path, protocol) {
    var index = this.findHandlerIndex(this.pathToRegExp(path).toString(), protocol);
    if (index !== -1) {
      this.handlers.splice(index, 1);
    } else {
      throw new Error("Unable to find a route matching the specified path and protocol.");
    }
  };
  WebSocketRouter.prototype.findHandlerIndex = function(pathString, protocol) {
    protocol = protocol.toLocaleLowerCase();
    for (var i = 0, len = this.handlers.length;i < len; i++) {
      var handler = this.handlers[i];
      if (handler.pathString === pathString && handler.protocol === protocol) {
        return i;
      }
    }
    return -1;
  };
  WebSocketRouter.prototype.pathToRegExp = function(path) {
    if (typeof path === "string") {
      if (path === "*") {
        path = /^.*$/;
      } else {
        path = path.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        path = new RegExp("^" + path + "$");
      }
    }
    return path;
  };
  WebSocketRouter.prototype.handleRequest = function(request) {
    var requestedProtocols = request.requestedProtocols;
    if (requestedProtocols.length === 0) {
      requestedProtocols = ["____no_protocol____"];
    }
    for (var i = 0;i < requestedProtocols.length; i++) {
      var requestedProtocol = requestedProtocols[i].toLocaleLowerCase();
      for (var j = 0, len = this.handlers.length;j < len; j++) {
        var handler = this.handlers[j];
        if (handler.path.test(request.resourceURL.pathname)) {
          if (requestedProtocol === handler.protocol || handler.protocol === "*") {
            var routerRequest = new WebSocketRouterRequest(request, requestedProtocol);
            handler.callback(routerRequest);
            return;
          }
        }
      }
    }
    request.reject(404, "No handler is available for the given request.");
  };
  module.exports = WebSocketRouter;
});

// node_modules/is-typedarray/index.js
var require_is_typedarray = __commonJS((exports, module) => {
  module.exports = isTypedArray2;
  isTypedArray2.strict = isStrictTypedArray;
  isTypedArray2.loose = isLooseTypedArray;
  var toString3 = Object.prototype.toString;
  var names = {
    "[object Int8Array]": true,
    "[object Int16Array]": true,
    "[object Int32Array]": true,
    "[object Uint8Array]": true,
    "[object Uint8ClampedArray]": true,
    "[object Uint16Array]": true,
    "[object Uint32Array]": true,
    "[object Float32Array]": true,
    "[object Float64Array]": true
  };
  function isTypedArray2(arr) {
    return isStrictTypedArray(arr) || isLooseTypedArray(arr);
  }
  function isStrictTypedArray(arr) {
    return arr instanceof Int8Array || arr instanceof Int16Array || arr instanceof Int32Array || arr instanceof Uint8Array || arr instanceof Uint8ClampedArray || arr instanceof Uint16Array || arr instanceof Uint32Array || arr instanceof Float32Array || arr instanceof Float64Array;
  }
  function isLooseTypedArray(arr) {
    return names[toString3.call(arr)];
  }
});

// node_modules/typedarray-to-buffer/index.js
var require_typedarray_to_buffer = __commonJS((exports, module) => {
  var isTypedArray2 = require_is_typedarray().strict;
  module.exports = function typedarrayToBuffer(arr) {
    if (isTypedArray2(arr)) {
      var buf = Buffer.from(arr.buffer);
      if (arr.byteLength !== arr.buffer.byteLength) {
        buf = buf.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
      }
      return buf;
    } else {
      return Buffer.from(arr);
    }
  };
});

// node_modules/yaeti/lib/EventTarget.js
var require_EventTarget = __commonJS((exports, module) => {
  module.exports = _EventTarget;
  function _EventTarget() {
    if (typeof this.addEventListener === "function") {
      return;
    }
    this._listeners = {};
    this.addEventListener = _addEventListener;
    this.removeEventListener = _removeEventListener;
    this.dispatchEvent = _dispatchEvent;
  }
  Object.defineProperties(_EventTarget.prototype, {
    listeners: {
      get: function() {
        return this._listeners;
      }
    }
  });
  function _addEventListener(type, newListener) {
    var listenersType, i, listener;
    if (!type || !newListener) {
      return;
    }
    listenersType = this._listeners[type];
    if (listenersType === undefined) {
      this._listeners[type] = listenersType = [];
    }
    for (i = 0;listener = listenersType[i]; i++) {
      if (listener === newListener) {
        return;
      }
    }
    listenersType.push(newListener);
  }
  function _removeEventListener(type, oldListener) {
    var listenersType, i, listener;
    if (!type || !oldListener) {
      return;
    }
    listenersType = this._listeners[type];
    if (listenersType === undefined) {
      return;
    }
    for (i = 0;listener = listenersType[i]; i++) {
      if (listener === oldListener) {
        listenersType.splice(i, 1);
        break;
      }
    }
    if (listenersType.length === 0) {
      delete this._listeners[type];
    }
  }
  function _dispatchEvent(event) {
    var type, listenersType, dummyListener, stopImmediatePropagation = false, i, listener;
    if (!event || typeof event.type !== "string") {
      throw new Error("`event` must have a valid `type` property");
    }
    if (event._yaeti) {
      event.target = this;
      event.cancelable = true;
    }
    try {
      event.stopImmediatePropagation = function() {
        stopImmediatePropagation = true;
      };
    } catch (error) {}
    type = event.type;
    listenersType = this._listeners[type] || [];
    dummyListener = this["on" + type];
    if (typeof dummyListener === "function") {
      dummyListener.call(this, event);
    }
    for (i = 0;listener = listenersType[i]; i++) {
      if (stopImmediatePropagation) {
        break;
      }
      listener.call(this, event);
    }
    return !event.defaultPrevented;
  }
});

// node_modules/yaeti/lib/Event.js
var require_Event = __commonJS((exports, module) => {
  module.exports = _Event;
  function _Event(type) {
    this.type = type;
    this.isTrusted = false;
    this._yaeti = true;
  }
});

// node_modules/yaeti/index.js
var require_yaeti = __commonJS((exports, module) => {
  module.exports = {
    EventTarget: require_EventTarget(),
    Event: require_Event()
  };
});

// node_modules/websocket/lib/W3CWebSocket.js
var require_W3CWebSocket = __commonJS((exports, module) => {
  var WebSocketClient = require_WebSocketClient();
  var toBuffer = require_typedarray_to_buffer();
  var yaeti = require_yaeti();
  var CONNECTING = 0;
  var OPEN = 1;
  var CLOSING = 2;
  var CLOSED = 3;
  module.exports = W3CWebSocket;
  function W3CWebSocket(url2, protocols, origin2, headers, requestOptions, clientConfig) {
    yaeti.EventTarget.call(this);
    clientConfig = clientConfig || {};
    clientConfig.assembleFragments = true;
    var self2 = this;
    this._url = url2;
    this._readyState = CONNECTING;
    this._protocol = undefined;
    this._extensions = "";
    this._bufferedAmount = 0;
    this._binaryType = "arraybuffer";
    this._connection = undefined;
    this._client = new WebSocketClient(clientConfig);
    this._client.on("connect", function(connection) {
      onConnect.call(self2, connection);
    });
    this._client.on("connectFailed", function() {
      onConnectFailed.call(self2);
    });
    this._client.connect(url2, protocols, origin2, headers, requestOptions);
  }
  Object.defineProperties(W3CWebSocket.prototype, {
    url: { get: function() {
      return this._url;
    } },
    readyState: { get: function() {
      return this._readyState;
    } },
    protocol: { get: function() {
      return this._protocol;
    } },
    extensions: { get: function() {
      return this._extensions;
    } },
    bufferedAmount: { get: function() {
      return this._bufferedAmount;
    } }
  });
  Object.defineProperties(W3CWebSocket.prototype, {
    binaryType: {
      get: function() {
        return this._binaryType;
      },
      set: function(type) {
        if (type !== "arraybuffer") {
          throw new SyntaxError('just "arraybuffer" type allowed for "binaryType" attribute');
        }
        this._binaryType = type;
      }
    }
  });
  [["CONNECTING", CONNECTING], ["OPEN", OPEN], ["CLOSING", CLOSING], ["CLOSED", CLOSED]].forEach(function(property) {
    Object.defineProperty(W3CWebSocket.prototype, property[0], {
      get: function() {
        return property[1];
      }
    });
  });
  [["CONNECTING", CONNECTING], ["OPEN", OPEN], ["CLOSING", CLOSING], ["CLOSED", CLOSED]].forEach(function(property) {
    Object.defineProperty(W3CWebSocket, property[0], {
      get: function() {
        return property[1];
      }
    });
  });
  W3CWebSocket.prototype.send = function(data) {
    if (this._readyState !== OPEN) {
      throw new Error("cannot call send() while not connected");
    }
    if (typeof data === "string" || data instanceof String) {
      this._connection.sendUTF(data);
    } else {
      if (data instanceof Buffer) {
        this._connection.sendBytes(data);
      } else if (data.byteLength || data.byteLength === 0) {
        data = toBuffer(data);
        this._connection.sendBytes(data);
      } else {
        throw new Error("unknown binary data:", data);
      }
    }
  };
  W3CWebSocket.prototype.close = function(code, reason) {
    switch (this._readyState) {
      case CONNECTING:
        onConnectFailed.call(this);
        this._client.on("connect", function(connection) {
          if (code) {
            connection.close(code, reason);
          } else {
            connection.close();
          }
        });
        break;
      case OPEN:
        this._readyState = CLOSING;
        if (code) {
          this._connection.close(code, reason);
        } else {
          this._connection.close();
        }
        break;
      case CLOSING:
      case CLOSED:
        break;
    }
  };
  function createCloseEvent(code, reason) {
    var event = new yaeti.Event("close");
    event.code = code;
    event.reason = reason;
    event.wasClean = typeof code === "undefined" || code === 1000;
    return event;
  }
  function createMessageEvent(data) {
    var event = new yaeti.Event("message");
    event.data = data;
    return event;
  }
  function onConnect(connection) {
    var self2 = this;
    this._readyState = OPEN;
    this._connection = connection;
    this._protocol = connection.protocol;
    this._extensions = connection.extensions;
    this._connection.on("close", function(code, reason) {
      onClose.call(self2, code, reason);
    });
    this._connection.on("message", function(msg) {
      onMessage.call(self2, msg);
    });
    this.dispatchEvent(new yaeti.Event("open"));
  }
  function onConnectFailed() {
    destroy.call(this);
    this._readyState = CLOSED;
    try {
      this.dispatchEvent(new yaeti.Event("error"));
    } finally {
      this.dispatchEvent(createCloseEvent(1006, "connection failed"));
    }
  }
  function onClose(code, reason) {
    destroy.call(this);
    this._readyState = CLOSED;
    this.dispatchEvent(createCloseEvent(code, reason || ""));
  }
  function onMessage(message) {
    if (message.utf8Data) {
      this.dispatchEvent(createMessageEvent(message.utf8Data));
    } else if (message.binaryData) {
      if (this.binaryType === "arraybuffer") {
        var buffer = message.binaryData;
        var arraybuffer = new ArrayBuffer(buffer.length);
        var view = new Uint8Array(arraybuffer);
        for (var i = 0, len = buffer.length;i < len; ++i) {
          view[i] = buffer[i];
        }
        this.dispatchEvent(createMessageEvent(arraybuffer));
      }
    }
  }
  function destroy() {
    this._client.removeAllListeners();
    if (this._connection) {
      this._connection.removeAllListeners();
    }
  }
});

// node_modules/websocket/lib/Deprecation.js
var require_Deprecation = __commonJS((exports, module) => {
  var Deprecation = {
    disableWarnings: false,
    deprecationWarningMap: {},
    warn: function(deprecationName) {
      if (!this.disableWarnings && this.deprecationWarningMap[deprecationName]) {
        console.warn("DEPRECATION WARNING: " + this.deprecationWarningMap[deprecationName]);
        this.deprecationWarningMap[deprecationName] = false;
      }
    }
  };
  module.exports = Deprecation;
});

// node_modules/websocket/package.json
var require_package = __commonJS((exports, module) => {
  module.exports = {
    name: "websocket",
    description: "Websocket Client & Server Library implementing the WebSocket protocol as specified in RFC 6455.",
    keywords: [
      "websocket",
      "websockets",
      "socket",
      "networking",
      "comet",
      "push",
      "RFC-6455",
      "realtime",
      "server",
      "client"
    ],
    author: "Brian McKelvey <theturtle32@gmail.com> (https://github.com/theturtle32)",
    contributors: [
      "I\xF1aki Baz Castillo <ibc@aliax.net> (http://dev.sipdoc.net)"
    ],
    version: "1.0.35",
    repository: {
      type: "git",
      url: "https://github.com/theturtle32/WebSocket-Node.git"
    },
    homepage: "https://github.com/theturtle32/WebSocket-Node",
    engines: {
      node: ">=4.0.0"
    },
    dependencies: {
      bufferutil: "^4.0.1",
      debug: "^2.2.0",
      "es5-ext": "^0.10.63",
      "typedarray-to-buffer": "^3.1.5",
      "utf-8-validate": "^5.0.2",
      yaeti: "^0.0.6"
    },
    devDependencies: {
      "buffer-equal": "^1.0.0",
      gulp: "^4.0.2",
      "gulp-jshint": "^2.0.4",
      "jshint-stylish": "^2.2.1",
      jshint: "^2.0.0",
      tape: "^4.9.1"
    },
    config: {
      verbose: false
    },
    scripts: {
      test: "tape test/unit/*.js",
      gulp: "gulp"
    },
    main: "index",
    directories: {
      lib: "./lib"
    },
    browser: "lib/browser.js",
    license: "Apache-2.0"
  };
});

// node_modules/websocket/lib/version.js
var require_version = __commonJS((exports, module) => {
  module.exports = require_package().version;
});

// node_modules/websocket/lib/websocket.js
var require_websocket = __commonJS((exports, module) => {
  module.exports = {
    server: require_WebSocketServer(),
    client: require_WebSocketClient(),
    router: require_WebSocketRouter(),
    frame: require_WebSocketFrame(),
    request: require_WebSocketRequest(),
    connection: require_WebSocketConnection(),
    w3cwebsocket: require_W3CWebSocket(),
    deprecation: require_Deprecation(),
    version: require_version()
  };
});

// node_modules/axios/lib/helpers/bind.js
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}

// node_modules/axios/lib/utils.js
var { toString } = Object.prototype;
var { getPrototypeOf } = Object;
var { iterator, toStringTag } = Symbol;
var kindOf = ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));
var kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
};
var typeOfTest = (type) => (thing) => typeof thing === type;
var { isArray } = Array;
var isUndefined = typeOfTest("undefined");
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
var isArrayBuffer = kindOfTest("ArrayBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
var isString = typeOfTest("string");
var isFunction = typeOfTest("function");
var isNumber = typeOfTest("number");
var isObject = (thing) => thing !== null && typeof thing === "object";
var isBoolean = (thing) => thing === true || thing === false;
var isPlainObject = (val) => {
  if (kindOf(val) !== "object") {
    return false;
  }
  const prototype = getPrototypeOf(val);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(toStringTag in val) && !(iterator in val);
};
var isEmptyObject = (val) => {
  if (!isObject(val) || isBuffer(val)) {
    return false;
  }
  try {
    return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
  } catch (e) {
    return false;
  }
};
var isDate = kindOfTest("Date");
var isFile = kindOfTest("File");
var isBlob = kindOfTest("Blob");
var isFileList = kindOfTest("FileList");
var isStream = (val) => isObject(val) && isFunction(val.pipe);
var isFormData = (thing) => {
  let kind;
  return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction(thing.append) && ((kind = kindOf(thing)) === "formdata" || kind === "object" && isFunction(thing.toString) && thing.toString() === "[object FormData]"));
};
var isURLSearchParams = kindOfTest("URLSearchParams");
var [isReadableStream, isRequest, isResponse, isHeaders] = [
  "ReadableStream",
  "Request",
  "Response",
  "Headers"
].map(kindOfTest);
var trim = (str) => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length;i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    if (isBuffer(obj)) {
      return;
    }
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0;i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  if (isBuffer(obj)) {
    return null;
  }
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
var _global = (() => {
  if (typeof globalThis !== "undefined")
    return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
var isContextDefined = (context) => !isUndefined(context) && context !== _global;
function merge() {
  const { caseless, skipUndefined } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return;
    }
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else if (!skipUndefined || !isUndefined(val)) {
      result[targetKey] = val;
    }
  };
  for (let i = 0, l = arguments.length;i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}
var extend = (a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction(val)) {
      Object.defineProperty(a, key, {
        value: bind(val, thisArg),
        writable: true,
        enumerable: true,
        configurable: true
      });
    } else {
      Object.defineProperty(a, key, {
        value: val,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }, { allOwnKeys });
  return a;
};
var stripBOM = (content) => {
  if (content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  return content;
};
var inherits = (constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  Object.defineProperty(constructor.prototype, "constructor", {
    value: constructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(constructor, "super", {
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};
var toFlatObject = (sourceObj, destObj, filter, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  if (sourceObj == null)
    return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
};
var endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === undefined || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};
var toArray = (thing) => {
  if (!thing)
    return null;
  if (isArray(thing))
    return thing;
  let i = thing.length;
  if (!isNumber(i))
    return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};
var isTypedArray = ((TypedArray) => {
  return (thing) => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
var forEachEntry = (obj, fn) => {
  const generator = obj && obj[iterator];
  const _iterator = generator.call(obj);
  let result;
  while ((result = _iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};
var matchAll = (regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }
  return arr;
};
var isHTMLForm = kindOfTest("HTMLFormElement");
var toCamelCase = (str) => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
    return p1.toUpperCase() + p2;
  });
};
var hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
var isRegExp = kindOfTest("RegExp");
var reduceDescriptors = (obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });
  Object.defineProperties(obj, reducedDescriptors);
};
var freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    if (isFunction(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
      return false;
    }
    const value = obj[name];
    if (!isFunction(value))
      return;
    descriptor.enumerable = false;
    if ("writable" in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error("Can not rewrite read-only method '" + name + "'");
      };
    }
  });
};
var toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};
  const define = (arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  };
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
};
var noop = () => {};
var toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
var toJSONObject = (obj) => {
  const stack = new Array(10);
  const visit = (source, i) => {
    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) {
        return;
      }
      if (isBuffer(source)) {
        return source;
      }
      if (!("toJSON" in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};
        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });
        stack[i] = undefined;
        return target;
      }
    }
    return source;
  };
  return visit(obj, 0);
};
var isAsyncFn = kindOfTest("AsyncFunction");
var isThenable = (thing) => thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);
var _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener("message", ({ source, data }) => {
      if (source === _global && data === token) {
        callbacks.length && callbacks.shift()();
      }
    }, false);
    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(typeof setImmediate === "function", isFunction(_global.postMessage));
var asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
var isIterable = (thing) => thing != null && isFunction(thing[iterator]);
var utils_default = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isEmptyObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap,
  isIterable
};

// node_modules/axios/lib/core/AxiosError.js
class AxiosError extends Error {
  static from(error, code, config, request, response, customProps) {
    const axiosError = new AxiosError(error.message, code || error.code, config, request, response);
    axiosError.cause = error;
    axiosError.name = error.name;
    customProps && Object.assign(axiosError, customProps);
    return axiosError;
  }
  constructor(message, code, config, request, response) {
    super(message);
    this.name = "AxiosError";
    this.isAxiosError = true;
    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);
    if (response) {
      this.response = response;
      this.status = response.status;
    }
  }
  toJSON() {
    return {
      message: this.message,
      name: this.name,
      description: this.description,
      number: this.number,
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      config: utils_default.toJSONObject(this.config),
      code: this.code,
      status: this.status
    };
  }
}
AxiosError.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
AxiosError.ERR_BAD_OPTION = "ERR_BAD_OPTION";
AxiosError.ECONNABORTED = "ECONNABORTED";
AxiosError.ETIMEDOUT = "ETIMEDOUT";
AxiosError.ERR_NETWORK = "ERR_NETWORK";
AxiosError.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
AxiosError.ERR_DEPRECATED = "ERR_DEPRECATED";
AxiosError.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
AxiosError.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
AxiosError.ERR_CANCELED = "ERR_CANCELED";
AxiosError.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
AxiosError.ERR_INVALID_URL = "ERR_INVALID_URL";
var AxiosError_default = AxiosError;

// node_modules/axios/lib/platform/node/classes/FormData.js
var import_form_data = __toESM(require_form_data(), 1);
var FormData_default = import_form_data.default;

// node_modules/axios/lib/helpers/toFormData.js
function isVisitable(thing) {
  return utils_default.isPlainObject(thing) || utils_default.isArray(thing);
}
function removeBrackets(key) {
  return utils_default.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
function renderKey(path, key, dots) {
  if (!path)
    return key;
  return path.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }).join(dots ? "." : "");
}
function isFlatArray(arr) {
  return utils_default.isArray(arr) && !arr.some(isVisitable);
}
var predicates = utils_default.toFlatObject(utils_default, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});
function toFormData(obj, formData, options) {
  if (!utils_default.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new (FormData_default || FormData);
  options = utils_default.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function defined(option, source) {
    return !utils_default.isUndefined(source[option]);
  });
  const metaTokens = options.metaTokens;
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
  const useBlob = _Blob && utils_default.isSpecCompliantForm(formData);
  if (!utils_default.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null)
      return "";
    if (utils_default.isDate(value)) {
      return value.toISOString();
    }
    if (utils_default.isBoolean(value)) {
      return value.toString();
    }
    if (!useBlob && utils_default.isBlob(value)) {
      throw new AxiosError_default("Blob is not supported. Use a Buffer instead.");
    }
    if (utils_default.isArrayBuffer(value) || utils_default.isTypedArray(value)) {
      return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
    }
    return value;
  }
  function defaultVisitor(value, key, path) {
    let arr = value;
    if (value && !path && typeof value === "object") {
      if (utils_default.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = JSON.stringify(value);
      } else if (utils_default.isArray(value) && isFlatArray(value) || (utils_default.isFileList(value) || utils_default.endsWith(key, "[]")) && (arr = utils_default.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(utils_default.isUndefined(el) || el === null) && formData.append(indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]", convertValue(el));
        });
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path, key, dots), convertValue(value));
    return false;
  }
  const stack = [];
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path) {
    if (utils_default.isUndefined(value))
      return;
    if (stack.indexOf(value) !== -1) {
      throw Error("Circular reference detected in " + path.join("."));
    }
    stack.push(value);
    utils_default.forEach(value, function each(el, key) {
      const result = !(utils_default.isUndefined(el) || el === null) && visitor.call(formData, el, utils_default.isString(key) ? key.trim() : key, path, exposedHelpers);
      if (result === true) {
        build(el, path ? path.concat(key) : [key]);
      }
    });
    stack.pop();
  }
  if (!utils_default.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
var toFormData_default = toFormData;

// node_modules/axios/lib/helpers/AxiosURLSearchParams.js
function encode(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+",
    "%00": "\x00"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData_default(params, this, options);
}
var prototype = AxiosURLSearchParams.prototype;
prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};
prototype.toString = function toString2(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode);
  } : encode;
  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + "=" + _encode(pair[1]);
  }, "").join("&");
};
var AxiosURLSearchParams_default = AxiosURLSearchParams;

// node_modules/axios/lib/helpers/buildURL.js
function encode2(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function buildURL(url, params, options) {
  if (!params) {
    return url;
  }
  const _encode = options && options.encode || encode2;
  const _options = utils_default.isFunction(options) ? {
    serialize: options
  } : options;
  const serializeFn = _options && _options.serialize;
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, _options);
  } else {
    serializedParams = utils_default.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams_default(params, _options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url;
}

// node_modules/axios/lib/core/InterceptorManager.js
class InterceptorManager {
  constructor() {
    this.handlers = [];
  }
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }
  forEach(fn) {
    utils_default.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}
var InterceptorManager_default = InterceptorManager;

// node_modules/axios/lib/defaults/transitional.js
var transitional_default = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false,
  legacyInterceptorReqResOrdering: true
};

// node_modules/axios/lib/platform/node/index.js
import crypto from "crypto";

// node_modules/axios/lib/platform/node/classes/URLSearchParams.js
import url from "url";
var URLSearchParams_default = url.URLSearchParams;

// node_modules/axios/lib/platform/node/index.js
var ALPHA = "abcdefghijklmnopqrstuvwxyz";
var DIGIT = "0123456789";
var ALPHABET = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
};
var generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
  let str = "";
  const { length } = alphabet;
  const randomValues = new Uint32Array(size);
  crypto.randomFillSync(randomValues);
  for (let i = 0;i < size; i++) {
    str += alphabet[randomValues[i] % length];
  }
  return str;
};
var node_default = {
  isNode: true,
  classes: {
    URLSearchParams: URLSearchParams_default,
    FormData: FormData_default,
    Blob: typeof Blob !== "undefined" && Blob || null
  },
  ALPHABET,
  generateString,
  protocols: ["http", "https", "file", "data"]
};

// node_modules/axios/lib/platform/common/utils.js
var exports_utils = {};
__export(exports_utils, {
  origin: () => origin,
  navigator: () => _navigator,
  hasStandardBrowserWebWorkerEnv: () => hasStandardBrowserWebWorkerEnv,
  hasStandardBrowserEnv: () => hasStandardBrowserEnv,
  hasBrowserEnv: () => hasBrowserEnv
});
var hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
var _navigator = typeof navigator === "object" && navigator || undefined;
var hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
var hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
var origin = hasBrowserEnv && window.location.href || "http://localhost";

// node_modules/axios/lib/platform/index.js
var platform_default = {
  ...exports_utils,
  ...node_default
};

// node_modules/axios/lib/helpers/toURLEncodedForm.js
function toURLEncodedForm(data, options) {
  return toFormData_default(data, new platform_default.classes.URLSearchParams, {
    visitor: function(value, key, path, helpers) {
      if (platform_default.isNode && utils_default.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    },
    ...options
  });
}

// node_modules/axios/lib/helpers/formDataToJSON.js
function parsePropPath(name) {
  return utils_default.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
    return match[0] === "[]" ? "" : match[1] || match[0];
  });
}
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0;i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];
    if (name === "__proto__")
      return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils_default.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils_default.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!target[name] || !utils_default.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path, value, target[name], index);
    if (result && utils_default.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  if (utils_default.isFormData(formData) && utils_default.isFunction(formData.entries)) {
    const obj = {};
    utils_default.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
var formDataToJSON_default = formDataToJSON;

// node_modules/axios/lib/defaults/index.js
function stringifySafely(rawValue, parser, encoder) {
  if (utils_default.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils_default.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") {
        throw e;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
var defaults = {
  transitional: transitional_default,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [function transformRequest(data, headers) {
    const contentType = headers.getContentType() || "";
    const hasJSONContentType = contentType.indexOf("application/json") > -1;
    const isObjectPayload = utils_default.isObject(data);
    if (isObjectPayload && utils_default.isHTMLForm(data)) {
      data = new FormData(data);
    }
    const isFormData2 = utils_default.isFormData(data);
    if (isFormData2) {
      return hasJSONContentType ? JSON.stringify(formDataToJSON_default(data)) : data;
    }
    if (utils_default.isArrayBuffer(data) || utils_default.isBuffer(data) || utils_default.isStream(data) || utils_default.isFile(data) || utils_default.isBlob(data) || utils_default.isReadableStream(data)) {
      return data;
    }
    if (utils_default.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils_default.isURLSearchParams(data)) {
      headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
      return data.toString();
    }
    let isFileList2;
    if (isObjectPayload) {
      if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
        return toURLEncodedForm(data, this.formSerializer).toString();
      }
      if ((isFileList2 = utils_default.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
        const _FormData = this.env && this.env.FormData;
        return toFormData_default(isFileList2 ? { "files[]": data } : data, _FormData && new _FormData, this.formSerializer);
      }
    }
    if (isObjectPayload || hasJSONContentType) {
      headers.setContentType("application/json", false);
      return stringifySafely(data);
    }
    return data;
  }],
  transformResponse: [function transformResponse(data) {
    const transitional = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    const JSONRequested = this.responseType === "json";
    if (utils_default.isResponse(data) || utils_default.isReadableStream(data)) {
      return data;
    }
    if (data && utils_default.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
      const silentJSONParsing = transitional && transitional.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;
      try {
        return JSON.parse(data, this.parseReviver);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === "SyntaxError") {
            throw AxiosError_default.from(e, AxiosError_default.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }
    return data;
  }],
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform_default.classes.FormData,
    Blob: platform_default.classes.Blob
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": undefined
    }
  }
};
utils_default.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
  defaults.headers[method] = {};
});
var defaults_default = defaults;

// node_modules/axios/lib/helpers/parseHeaders.js
var ignoreDuplicateOf = utils_default.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]);
var parseHeaders_default = (rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split(`
`).forEach(function parser(line) {
    i = line.indexOf(":");
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    if (!key || parsed[key] && ignoreDuplicateOf[key]) {
      return;
    }
    if (key === "set-cookie") {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
    }
  });
  return parsed;
};

// node_modules/axios/lib/core/AxiosHeaders.js
var $internals = Symbol("internals");
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils_default.isArray(value) ? value.map(normalizeValue) : String(value);
}
function parseTokens(str) {
  const tokens = Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
var isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils_default.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils_default.isString(value))
    return;
  if (utils_default.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils_default.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = utils_default.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}

class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self2 = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) {
        throw new Error("header name must be a non-empty string");
      }
      const key = utils_default.findKey(self2, lHeader);
      if (!key || self2[key] === undefined || _rewrite === true || _rewrite === undefined && self2[key] !== false) {
        self2[key || _header] = normalizeValue(_value);
      }
    }
    const setHeaders = (headers, _rewrite) => utils_default.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (utils_default.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils_default.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders_default(header), valueOrRewrite);
    } else if (utils_default.isObject(header) && utils_default.isIterable(header)) {
      let obj = {}, dest, key;
      for (const entry of header) {
        if (!utils_default.isArray(entry)) {
          throw TypeError("Object iterator must return a key-value pair");
        }
        obj[key = entry[0]] = (dest = obj[key]) ? utils_default.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
      }
      setHeaders(obj, valueOrRewrite);
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils_default.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) {
          return value;
        }
        if (parser === true) {
          return parseTokens(value);
        }
        if (utils_default.isFunction(parser)) {
          return parser.call(this, value, key);
        }
        if (utils_default.isRegExp(parser)) {
          return parser.exec(value);
        }
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils_default.findKey(this, header);
      return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self2 = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = utils_default.findKey(self2, _header);
        if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
          delete self2[key];
          deleted = true;
        }
      }
    }
    if (utils_default.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self2 = this;
    const headers = {};
    utils_default.forEach(this, (value, header) => {
      const key = utils_default.findKey(headers, header);
      if (key) {
        self2[key] = normalizeValue(value);
        delete self2[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) {
        delete self2[header];
      }
      self2[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = Object.create(null);
    utils_default.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils_default.isArray(value) ? value.join(", ") : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join(`
`);
  }
  getSetCookie() {
    return this.get("set-cookie") || [];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals] = this[$internals] = {
      accessors: {}
    };
    const accessors = internals.accessors;
    const prototype2 = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype2, _header);
        accessors[lHeader] = true;
      }
    }
    utils_default.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
}
AxiosHeaders.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
utils_default.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
utils_default.freezeMethods(AxiosHeaders);
var AxiosHeaders_default = AxiosHeaders;

// node_modules/axios/lib/core/transformData.js
function transformData(fns, response) {
  const config = this || defaults_default;
  const context = response || config;
  const headers = AxiosHeaders_default.from(context.headers);
  let data = context.data;
  utils_default.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
  });
  headers.normalize();
  return data;
}

// node_modules/axios/lib/cancel/isCancel.js
function isCancel(value) {
  return !!(value && value.__CANCEL__);
}

// node_modules/axios/lib/cancel/CanceledError.js
class CanceledError extends AxiosError_default {
  constructor(message, config, request) {
    super(message == null ? "canceled" : message, AxiosError_default.ERR_CANCELED, config, request);
    this.name = "CanceledError";
    this.__CANCEL__ = true;
  }
}
var CanceledError_default = CanceledError;

// node_modules/axios/lib/core/settle.js
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError_default("Request failed with status code " + response.status, [AxiosError_default.ERR_BAD_REQUEST, AxiosError_default.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4], response.config, response.request, response));
  }
}

// node_modules/axios/lib/helpers/isAbsoluteURL.js
function isAbsoluteURL(url2) {
  if (typeof url2 !== "string") {
    return false;
  }
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url2);
}

// node_modules/axios/lib/helpers/combineURLs.js
function combineURLs(baseURL, relativeURL) {
  return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
}

// node_modules/axios/lib/core/buildFullPath.js
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}

// node_modules/axios/lib/adapters/http.js
var import_proxy_from_env = __toESM(require_proxy_from_env(), 1);
var import_follow_redirects = __toESM(require_follow_redirects(), 1);
import http from "http";
import https from "https";
import http2 from "http2";
import util2 from "util";
import zlib from "zlib";

// node_modules/axios/lib/env/data.js
var VERSION = "1.13.5";

// node_modules/axios/lib/helpers/parseProtocol.js
function parseProtocol(url2) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url2);
  return match && match[1] || "";
}

// node_modules/axios/lib/helpers/fromDataURI.js
var DATA_URL_PATTERN = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
function fromDataURI(uri, asBlob, options) {
  const _Blob = options && options.Blob || platform_default.classes.Blob;
  const protocol = parseProtocol(uri);
  if (asBlob === undefined && _Blob) {
    asBlob = true;
  }
  if (protocol === "data") {
    uri = protocol.length ? uri.slice(protocol.length + 1) : uri;
    const match = DATA_URL_PATTERN.exec(uri);
    if (!match) {
      throw new AxiosError_default("Invalid URL", AxiosError_default.ERR_INVALID_URL);
    }
    const mime = match[1];
    const isBase64 = match[2];
    const body = match[3];
    const buffer = Buffer.from(decodeURIComponent(body), isBase64 ? "base64" : "utf8");
    if (asBlob) {
      if (!_Blob) {
        throw new AxiosError_default("Blob is not supported", AxiosError_default.ERR_NOT_SUPPORT);
      }
      return new _Blob([buffer], { type: mime });
    }
    return buffer;
  }
  throw new AxiosError_default("Unsupported protocol " + protocol, AxiosError_default.ERR_NOT_SUPPORT);
}

// node_modules/axios/lib/adapters/http.js
import stream3 from "stream";

// node_modules/axios/lib/helpers/AxiosTransformStream.js
import stream from "stream";
var kInternals = Symbol("internals");

class AxiosTransformStream extends stream.Transform {
  constructor(options) {
    options = utils_default.toFlatObject(options, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    }, null, (prop, source) => {
      return !utils_default.isUndefined(source[prop]);
    });
    super({
      readableHighWaterMark: options.chunkSize
    });
    const internals = this[kInternals] = {
      timeWindow: options.timeWindow,
      chunkSize: options.chunkSize,
      maxRate: options.maxRate,
      minChunkSize: options.minChunkSize,
      bytesSeen: 0,
      isCaptured: false,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (event) => {
      if (event === "progress") {
        if (!internals.isCaptured) {
          internals.isCaptured = true;
        }
      }
    });
  }
  _read(size) {
    const internals = this[kInternals];
    if (internals.onReadCallback) {
      internals.onReadCallback();
    }
    return super._read(size);
  }
  _transform(chunk, encoding, callback) {
    const internals = this[kInternals];
    const maxRate = internals.maxRate;
    const readableHighWaterMark = this.readableHighWaterMark;
    const timeWindow = internals.timeWindow;
    const divider = 1000 / timeWindow;
    const bytesThreshold = maxRate / divider;
    const minChunkSize = internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;
    const pushChunk = (_chunk, _callback) => {
      const bytes = Buffer.byteLength(_chunk);
      internals.bytesSeen += bytes;
      internals.bytes += bytes;
      internals.isCaptured && this.emit("progress", internals.bytesSeen);
      if (this.push(_chunk)) {
        process.nextTick(_callback);
      } else {
        internals.onReadCallback = () => {
          internals.onReadCallback = null;
          process.nextTick(_callback);
        };
      }
    };
    const transformChunk = (_chunk, _callback) => {
      const chunkSize = Buffer.byteLength(_chunk);
      let chunkRemainder = null;
      let maxChunkSize = readableHighWaterMark;
      let bytesLeft;
      let passed = 0;
      if (maxRate) {
        const now = Date.now();
        if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
          internals.ts = now;
          bytesLeft = bytesThreshold - internals.bytes;
          internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
          passed = 0;
        }
        bytesLeft = bytesThreshold - internals.bytes;
      }
      if (maxRate) {
        if (bytesLeft <= 0) {
          return setTimeout(() => {
            _callback(null, _chunk);
          }, timeWindow - passed);
        }
        if (bytesLeft < maxChunkSize) {
          maxChunkSize = bytesLeft;
        }
      }
      if (maxChunkSize && chunkSize > maxChunkSize && chunkSize - maxChunkSize > minChunkSize) {
        chunkRemainder = _chunk.subarray(maxChunkSize);
        _chunk = _chunk.subarray(0, maxChunkSize);
      }
      pushChunk(_chunk, chunkRemainder ? () => {
        process.nextTick(_callback, null, chunkRemainder);
      } : _callback);
    };
    transformChunk(chunk, function transformNextChunk(err, _chunk) {
      if (err) {
        return callback(err);
      }
      if (_chunk) {
        transformChunk(_chunk, transformNextChunk);
      } else {
        callback(null);
      }
    });
  }
}
var AxiosTransformStream_default = AxiosTransformStream;

// node_modules/axios/lib/adapters/http.js
import { EventEmitter } from "events";

// node_modules/axios/lib/helpers/formDataToStream.js
import util from "util";
import { Readable } from "stream";

// node_modules/axios/lib/helpers/readBlob.js
var { asyncIterator } = Symbol;
var readBlob = async function* (blob) {
  if (blob.stream) {
    yield* blob.stream();
  } else if (blob.arrayBuffer) {
    yield await blob.arrayBuffer();
  } else if (blob[asyncIterator]) {
    yield* blob[asyncIterator]();
  } else {
    yield blob;
  }
};
var readBlob_default = readBlob;

// node_modules/axios/lib/helpers/formDataToStream.js
var BOUNDARY_ALPHABET = platform_default.ALPHABET.ALPHA_DIGIT + "-_";
var textEncoder = typeof TextEncoder === "function" ? new TextEncoder : new util.TextEncoder;
var CRLF = `\r
`;
var CRLF_BYTES = textEncoder.encode(CRLF);
var CRLF_BYTES_COUNT = 2;

class FormDataPart {
  constructor(name, value) {
    const { escapeName } = this.constructor;
    const isStringValue = utils_default.isString(value);
    let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ""}${CRLF}`;
    if (isStringValue) {
      value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
    } else {
      headers += `Content-Type: ${value.type || "application/octet-stream"}${CRLF}`;
    }
    this.headers = textEncoder.encode(headers + CRLF);
    this.contentLength = isStringValue ? value.byteLength : value.size;
    this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
    this.name = name;
    this.value = value;
  }
  async* encode() {
    yield this.headers;
    const { value } = this;
    if (utils_default.isTypedArray(value)) {
      yield value;
    } else {
      yield* readBlob_default(value);
    }
    yield CRLF_BYTES;
  }
  static escapeName(name) {
    return String(name).replace(/[\r\n"]/g, (match) => ({
      "\r": "%0D",
      "\n": "%0A",
      '"': "%22"
    })[match]);
  }
}
var formDataToStream = (form, headersHandler, options) => {
  const {
    tag = "form-data-boundary",
    size = 25,
    boundary = tag + "-" + platform_default.generateString(size, BOUNDARY_ALPHABET)
  } = options || {};
  if (!utils_default.isFormData(form)) {
    throw TypeError("FormData instance required");
  }
  if (boundary.length < 1 || boundary.length > 70) {
    throw Error("boundary must be 10-70 characters long");
  }
  const boundaryBytes = textEncoder.encode("--" + boundary + CRLF);
  const footerBytes = textEncoder.encode("--" + boundary + "--" + CRLF);
  let contentLength = footerBytes.byteLength;
  const parts = Array.from(form.entries()).map(([name, value]) => {
    const part = new FormDataPart(name, value);
    contentLength += part.size;
    return part;
  });
  contentLength += boundaryBytes.byteLength * parts.length;
  contentLength = utils_default.toFiniteNumber(contentLength);
  const computedHeaders = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`
  };
  if (Number.isFinite(contentLength)) {
    computedHeaders["Content-Length"] = contentLength;
  }
  headersHandler && headersHandler(computedHeaders);
  return Readable.from(async function* () {
    for (const part of parts) {
      yield boundaryBytes;
      yield* part.encode();
    }
    yield footerBytes;
  }());
};
var formDataToStream_default = formDataToStream;

// node_modules/axios/lib/helpers/ZlibHeaderTransformStream.js
import stream2 from "stream";

class ZlibHeaderTransformStream extends stream2.Transform {
  __transform(chunk, encoding, callback) {
    this.push(chunk);
    callback();
  }
  _transform(chunk, encoding, callback) {
    if (chunk.length !== 0) {
      this._transform = this.__transform;
      if (chunk[0] !== 120) {
        const header = Buffer.alloc(2);
        header[0] = 120;
        header[1] = 156;
        this.push(header, encoding);
      }
    }
    this.__transform(chunk, encoding, callback);
  }
}
var ZlibHeaderTransformStream_default = ZlibHeaderTransformStream;

// node_modules/axios/lib/helpers/callbackify.js
var callbackify = (fn, reducer) => {
  return utils_default.isAsyncFn(fn) ? function(...args) {
    const cb = args.pop();
    fn.apply(this, args).then((value) => {
      try {
        reducer ? cb(null, ...reducer(value)) : cb(null, value);
      } catch (err) {
        cb(err);
      }
    }, cb);
  } : fn;
};
var callbackify_default = callbackify;

// node_modules/axios/lib/helpers/speedometer.js
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== undefined ? min : 1000;
  return function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
  };
}
var speedometer_default = speedometer;

// node_modules/axios/lib/helpers/throttle.js
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1000 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };
  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };
  const flush = () => lastArgs && invoke(lastArgs);
  return [throttled, flush];
}
var throttle_default = throttle;

// node_modules/axios/lib/helpers/progressEventReducer.js
var progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer_default(50, 250);
  return throttle_default((e) => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : undefined;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;
    bytesNotified = loaded;
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true
    };
    listener(data);
  }, freq);
};
var progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;
  return [(loaded) => throttled[0]({
    lengthComputable,
    total,
    loaded
  }), throttled[1]];
};
var asyncDecorator = (fn) => (...args) => utils_default.asap(() => fn(...args));

// node_modules/axios/lib/helpers/estimateDataURLDecodedBytes.js
function estimateDataURLDecodedBytes(url2) {
  if (!url2 || typeof url2 !== "string")
    return 0;
  if (!url2.startsWith("data:"))
    return 0;
  const comma = url2.indexOf(",");
  if (comma < 0)
    return 0;
  const meta = url2.slice(5, comma);
  const body = url2.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);
  if (isBase64) {
    let effectiveLen = body.length;
    const len = body.length;
    for (let i = 0;i < len; i++) {
      if (body.charCodeAt(i) === 37 && i + 2 < len) {
        const a = body.charCodeAt(i + 1);
        const b = body.charCodeAt(i + 2);
        const isHex = (a >= 48 && a <= 57 || a >= 65 && a <= 70 || a >= 97 && a <= 102) && (b >= 48 && b <= 57 || b >= 65 && b <= 70 || b >= 97 && b <= 102);
        if (isHex) {
          effectiveLen -= 2;
          i += 2;
        }
      }
    }
    let pad = 0;
    let idx = len - 1;
    const tailIsPct3D = (j) => j >= 2 && body.charCodeAt(j - 2) === 37 && body.charCodeAt(j - 1) === 51 && (body.charCodeAt(j) === 68 || body.charCodeAt(j) === 100);
    if (idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
        idx--;
      } else if (tailIsPct3D(idx)) {
        pad++;
        idx -= 3;
      }
    }
    if (pad === 1 && idx >= 0) {
      if (body.charCodeAt(idx) === 61) {
        pad++;
      } else if (tailIsPct3D(idx)) {
        pad++;
      }
    }
    const groups = Math.floor(effectiveLen / 4);
    const bytes = groups * 3 - (pad || 0);
    return bytes > 0 ? bytes : 0;
  }
  return Buffer.byteLength(body, "utf8");
}

// node_modules/axios/lib/adapters/http.js
var zlibOptions = {
  flush: zlib.constants.Z_SYNC_FLUSH,
  finishFlush: zlib.constants.Z_SYNC_FLUSH
};
var brotliOptions = {
  flush: zlib.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH
};
var isBrotliSupported = utils_default.isFunction(zlib.createBrotliDecompress);
var { http: httpFollow, https: httpsFollow } = import_follow_redirects.default;
var isHttps = /https:?/;
var supportedProtocols = platform_default.protocols.map((protocol) => {
  return protocol + ":";
});
var flushOnFinish = (stream4, [throttled, flush]) => {
  stream4.on("end", flush).on("error", flush);
  return throttled;
};

class Http2Sessions {
  constructor() {
    this.sessions = Object.create(null);
  }
  getSession(authority, options) {
    options = Object.assign({
      sessionTimeout: 1000
    }, options);
    let authoritySessions = this.sessions[authority];
    if (authoritySessions) {
      let len = authoritySessions.length;
      for (let i = 0;i < len; i++) {
        const [sessionHandle, sessionOptions] = authoritySessions[i];
        if (!sessionHandle.destroyed && !sessionHandle.closed && util2.isDeepStrictEqual(sessionOptions, options)) {
          return sessionHandle;
        }
      }
    }
    const session = http2.connect(authority, options);
    let removed;
    const removeSession = () => {
      if (removed) {
        return;
      }
      removed = true;
      let entries = authoritySessions, len = entries.length, i = len;
      while (i--) {
        if (entries[i][0] === session) {
          if (len === 1) {
            delete this.sessions[authority];
          } else {
            entries.splice(i, 1);
          }
          return;
        }
      }
    };
    const originalRequestFn = session.request;
    const { sessionTimeout } = options;
    if (sessionTimeout != null) {
      let timer;
      let streamsCount = 0;
      session.request = function() {
        const stream4 = originalRequestFn.apply(this, arguments);
        streamsCount++;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        stream4.once("close", () => {
          if (!--streamsCount) {
            timer = setTimeout(() => {
              timer = null;
              removeSession();
            }, sessionTimeout);
          }
        });
        return stream4;
      };
    }
    session.once("close", removeSession);
    let entry = [
      session,
      options
    ];
    authoritySessions ? authoritySessions.push(entry) : authoritySessions = this.sessions[authority] = [entry];
    return session;
  }
}
var http2Sessions = new Http2Sessions;
function dispatchBeforeRedirect(options, responseDetails) {
  if (options.beforeRedirects.proxy) {
    options.beforeRedirects.proxy(options);
  }
  if (options.beforeRedirects.config) {
    options.beforeRedirects.config(options, responseDetails);
  }
}
function setProxy(options, configProxy, location) {
  let proxy = configProxy;
  if (!proxy && proxy !== false) {
    const proxyUrl = import_proxy_from_env.default.getProxyForUrl(location);
    if (proxyUrl) {
      proxy = new URL(proxyUrl);
    }
  }
  if (proxy) {
    if (proxy.username) {
      proxy.auth = (proxy.username || "") + ":" + (proxy.password || "");
    }
    if (proxy.auth) {
      const validProxyAuth = Boolean(proxy.auth.username || proxy.auth.password);
      if (validProxyAuth) {
        proxy.auth = (proxy.auth.username || "") + ":" + (proxy.auth.password || "");
      } else if (typeof proxy.auth === "object") {
        throw new AxiosError_default("Invalid proxy authorization", AxiosError_default.ERR_BAD_OPTION, { proxy });
      }
      const base64 = Buffer.from(proxy.auth, "utf8").toString("base64");
      options.headers["Proxy-Authorization"] = "Basic " + base64;
    }
    options.headers.host = options.hostname + (options.port ? ":" + options.port : "");
    const proxyHost = proxy.hostname || proxy.host;
    options.hostname = proxyHost;
    options.host = proxyHost;
    options.port = proxy.port;
    options.path = location;
    if (proxy.protocol) {
      options.protocol = proxy.protocol.includes(":") ? proxy.protocol : `${proxy.protocol}:`;
    }
  }
  options.beforeRedirects.proxy = function beforeRedirect(redirectOptions) {
    setProxy(redirectOptions, configProxy, redirectOptions.href);
  };
}
var isHttpAdapterSupported = typeof process !== "undefined" && utils_default.kindOf(process) === "process";
var wrapAsync = (asyncExecutor) => {
  return new Promise((resolve, reject) => {
    let onDone;
    let isDone;
    const done = (value, isRejected) => {
      if (isDone)
        return;
      isDone = true;
      onDone && onDone(value, isRejected);
    };
    const _resolve = (value) => {
      done(value);
      resolve(value);
    };
    const _reject = (reason) => {
      done(reason, true);
      reject(reason);
    };
    asyncExecutor(_resolve, _reject, (onDoneHandler) => onDone = onDoneHandler).catch(_reject);
  });
};
var resolveFamily = ({ address, family }) => {
  if (!utils_default.isString(address)) {
    throw TypeError("address must be a string");
  }
  return {
    address,
    family: family || (address.indexOf(".") < 0 ? 6 : 4)
  };
};
var buildAddressEntry = (address, family) => resolveFamily(utils_default.isObject(address) ? address : { address, family });
var http2Transport = {
  request(options, cb) {
    const authority = options.protocol + "//" + options.hostname + ":" + (options.port || (options.protocol === "https:" ? 443 : 80));
    const { http2Options, headers } = options;
    const session = http2Sessions.getSession(authority, http2Options);
    const {
      HTTP2_HEADER_SCHEME,
      HTTP2_HEADER_METHOD,
      HTTP2_HEADER_PATH,
      HTTP2_HEADER_STATUS
    } = http2.constants;
    const http2Headers = {
      [HTTP2_HEADER_SCHEME]: options.protocol.replace(":", ""),
      [HTTP2_HEADER_METHOD]: options.method,
      [HTTP2_HEADER_PATH]: options.path
    };
    utils_default.forEach(headers, (header, name) => {
      name.charAt(0) !== ":" && (http2Headers[name] = header);
    });
    const req = session.request(http2Headers);
    req.once("response", (responseHeaders) => {
      const response = req;
      responseHeaders = Object.assign({}, responseHeaders);
      const status = responseHeaders[HTTP2_HEADER_STATUS];
      delete responseHeaders[HTTP2_HEADER_STATUS];
      response.headers = responseHeaders;
      response.statusCode = +status;
      cb(response);
    });
    return req;
  }
};
var http_default = isHttpAdapterSupported && function httpAdapter(config) {
  return wrapAsync(async function dispatchHttpRequest(resolve, reject, onDone) {
    let { data, lookup, family, httpVersion = 1, http2Options } = config;
    const { responseType, responseEncoding } = config;
    const method = config.method.toUpperCase();
    let isDone;
    let rejected = false;
    let req;
    httpVersion = +httpVersion;
    if (Number.isNaN(httpVersion)) {
      throw TypeError(`Invalid protocol version: '${config.httpVersion}' is not a number`);
    }
    if (httpVersion !== 1 && httpVersion !== 2) {
      throw TypeError(`Unsupported protocol version '${httpVersion}'`);
    }
    const isHttp2 = httpVersion === 2;
    if (lookup) {
      const _lookup = callbackify_default(lookup, (value) => utils_default.isArray(value) ? value : [value]);
      lookup = (hostname, opt, cb) => {
        _lookup(hostname, opt, (err, arg0, arg1) => {
          if (err) {
            return cb(err);
          }
          const addresses = utils_default.isArray(arg0) ? arg0.map((addr) => buildAddressEntry(addr)) : [buildAddressEntry(arg0, arg1)];
          opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family);
        });
      };
    }
    const abortEmitter = new EventEmitter;
    function abort(reason) {
      try {
        abortEmitter.emit("abort", !reason || reason.type ? new CanceledError_default(null, config, req) : reason);
      } catch (err) {
        console.warn("emit error", err);
      }
    }
    abortEmitter.once("abort", reject);
    const onFinished = () => {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(abort);
      }
      if (config.signal) {
        config.signal.removeEventListener("abort", abort);
      }
      abortEmitter.removeAllListeners();
    };
    if (config.cancelToken || config.signal) {
      config.cancelToken && config.cancelToken.subscribe(abort);
      if (config.signal) {
        config.signal.aborted ? abort() : config.signal.addEventListener("abort", abort);
      }
    }
    onDone((response, isRejected) => {
      isDone = true;
      if (isRejected) {
        rejected = true;
        onFinished();
        return;
      }
      const { data: data2 } = response;
      if (data2 instanceof stream3.Readable || data2 instanceof stream3.Duplex) {
        const offListeners = stream3.finished(data2, () => {
          offListeners();
          onFinished();
        });
      } else {
        onFinished();
      }
    });
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    const parsed = new URL(fullPath, platform_default.hasBrowserEnv ? platform_default.origin : undefined);
    const protocol = parsed.protocol || supportedProtocols[0];
    if (protocol === "data:") {
      if (config.maxContentLength > -1) {
        const dataUrl = String(config.url || fullPath || "");
        const estimated = estimateDataURLDecodedBytes(dataUrl);
        if (estimated > config.maxContentLength) {
          return reject(new AxiosError_default("maxContentLength size of " + config.maxContentLength + " exceeded", AxiosError_default.ERR_BAD_RESPONSE, config));
        }
      }
      let convertedData;
      if (method !== "GET") {
        return settle(resolve, reject, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config
        });
      }
      try {
        convertedData = fromDataURI(config.url, responseType === "blob", {
          Blob: config.env && config.env.Blob
        });
      } catch (err) {
        throw AxiosError_default.from(err, AxiosError_default.ERR_BAD_REQUEST, config);
      }
      if (responseType === "text") {
        convertedData = convertedData.toString(responseEncoding);
        if (!responseEncoding || responseEncoding === "utf8") {
          convertedData = utils_default.stripBOM(convertedData);
        }
      } else if (responseType === "stream") {
        convertedData = stream3.Readable.from(convertedData);
      }
      return settle(resolve, reject, {
        data: convertedData,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders_default,
        config
      });
    }
    if (supportedProtocols.indexOf(protocol) === -1) {
      return reject(new AxiosError_default("Unsupported protocol " + protocol, AxiosError_default.ERR_BAD_REQUEST, config));
    }
    const headers = AxiosHeaders_default.from(config.headers).normalize();
    headers.set("User-Agent", "axios/" + VERSION, false);
    const { onUploadProgress, onDownloadProgress } = config;
    const maxRate = config.maxRate;
    let maxUploadRate = undefined;
    let maxDownloadRate = undefined;
    if (utils_default.isSpecCompliantForm(data)) {
      const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);
      data = formDataToStream_default(data, (formHeaders) => {
        headers.set(formHeaders);
      }, {
        tag: `axios-${VERSION}-boundary`,
        boundary: userBoundary && userBoundary[1] || undefined
      });
    } else if (utils_default.isFormData(data) && utils_default.isFunction(data.getHeaders)) {
      headers.set(data.getHeaders());
      if (!headers.hasContentLength()) {
        try {
          const knownLength = await util2.promisify(data.getLength).call(data);
          Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength);
        } catch (e) {}
      }
    } else if (utils_default.isBlob(data) || utils_default.isFile(data)) {
      data.size && headers.setContentType(data.type || "application/octet-stream");
      headers.setContentLength(data.size || 0);
      data = stream3.Readable.from(readBlob_default(data));
    } else if (data && !utils_default.isStream(data)) {
      if (Buffer.isBuffer(data)) {} else if (utils_default.isArrayBuffer(data)) {
        data = Buffer.from(new Uint8Array(data));
      } else if (utils_default.isString(data)) {
        data = Buffer.from(data, "utf-8");
      } else {
        return reject(new AxiosError_default("Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream", AxiosError_default.ERR_BAD_REQUEST, config));
      }
      headers.setContentLength(data.length, false);
      if (config.maxBodyLength > -1 && data.length > config.maxBodyLength) {
        return reject(new AxiosError_default("Request body larger than maxBodyLength limit", AxiosError_default.ERR_BAD_REQUEST, config));
      }
    }
    const contentLength = utils_default.toFiniteNumber(headers.getContentLength());
    if (utils_default.isArray(maxRate)) {
      maxUploadRate = maxRate[0];
      maxDownloadRate = maxRate[1];
    } else {
      maxUploadRate = maxDownloadRate = maxRate;
    }
    if (data && (onUploadProgress || maxUploadRate)) {
      if (!utils_default.isStream(data)) {
        data = stream3.Readable.from(data, { objectMode: false });
      }
      data = stream3.pipeline([data, new AxiosTransformStream_default({
        maxRate: utils_default.toFiniteNumber(maxUploadRate)
      })], utils_default.noop);
      onUploadProgress && data.on("progress", flushOnFinish(data, progressEventDecorator(contentLength, progressEventReducer(asyncDecorator(onUploadProgress), false, 3))));
    }
    let auth = undefined;
    if (config.auth) {
      const username = config.auth.username || "";
      const password = config.auth.password || "";
      auth = username + ":" + password;
    }
    if (!auth && parsed.username) {
      const urlUsername = parsed.username;
      const urlPassword = parsed.password;
      auth = urlUsername + ":" + urlPassword;
    }
    auth && headers.delete("authorization");
    let path;
    try {
      path = buildURL(parsed.pathname + parsed.search, config.params, config.paramsSerializer).replace(/^\?/, "");
    } catch (err) {
      const customErr = new Error(err.message);
      customErr.config = config;
      customErr.url = config.url;
      customErr.exists = true;
      return reject(customErr);
    }
    headers.set("Accept-Encoding", "gzip, compress, deflate" + (isBrotliSupported ? ", br" : ""), false);
    const options = {
      path,
      method,
      headers: headers.toJSON(),
      agents: { http: config.httpAgent, https: config.httpsAgent },
      auth,
      protocol,
      family,
      beforeRedirect: dispatchBeforeRedirect,
      beforeRedirects: {},
      http2Options
    };
    !utils_default.isUndefined(lookup) && (options.lookup = lookup);
    if (config.socketPath) {
      options.socketPath = config.socketPath;
    } else {
      options.hostname = parsed.hostname.startsWith("[") ? parsed.hostname.slice(1, -1) : parsed.hostname;
      options.port = parsed.port;
      setProxy(options, config.proxy, protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options.path);
    }
    let transport;
    const isHttpsRequest = isHttps.test(options.protocol);
    options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
    if (isHttp2) {
      transport = http2Transport;
    } else {
      if (config.transport) {
        transport = config.transport;
      } else if (config.maxRedirects === 0) {
        transport = isHttpsRequest ? https : http;
      } else {
        if (config.maxRedirects) {
          options.maxRedirects = config.maxRedirects;
        }
        if (config.beforeRedirect) {
          options.beforeRedirects.config = config.beforeRedirect;
        }
        transport = isHttpsRequest ? httpsFollow : httpFollow;
      }
    }
    if (config.maxBodyLength > -1) {
      options.maxBodyLength = config.maxBodyLength;
    } else {
      options.maxBodyLength = Infinity;
    }
    if (config.insecureHTTPParser) {
      options.insecureHTTPParser = config.insecureHTTPParser;
    }
    req = transport.request(options, function handleResponse(res) {
      if (req.destroyed)
        return;
      const streams = [res];
      const responseLength = utils_default.toFiniteNumber(res.headers["content-length"]);
      if (onDownloadProgress || maxDownloadRate) {
        const transformStream = new AxiosTransformStream_default({
          maxRate: utils_default.toFiniteNumber(maxDownloadRate)
        });
        onDownloadProgress && transformStream.on("progress", flushOnFinish(transformStream, progressEventDecorator(responseLength, progressEventReducer(asyncDecorator(onDownloadProgress), true, 3))));
        streams.push(transformStream);
      }
      let responseStream = res;
      const lastRequest = res.req || req;
      if (config.decompress !== false && res.headers["content-encoding"]) {
        if (method === "HEAD" || res.statusCode === 204) {
          delete res.headers["content-encoding"];
        }
        switch ((res.headers["content-encoding"] || "").toLowerCase()) {
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            streams.push(zlib.createUnzip(zlibOptions));
            delete res.headers["content-encoding"];
            break;
          case "deflate":
            streams.push(new ZlibHeaderTransformStream_default);
            streams.push(zlib.createUnzip(zlibOptions));
            delete res.headers["content-encoding"];
            break;
          case "br":
            if (isBrotliSupported) {
              streams.push(zlib.createBrotliDecompress(brotliOptions));
              delete res.headers["content-encoding"];
            }
        }
      }
      responseStream = streams.length > 1 ? stream3.pipeline(streams, utils_default.noop) : streams[0];
      const response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: new AxiosHeaders_default(res.headers),
        config,
        request: lastRequest
      };
      if (responseType === "stream") {
        response.data = responseStream;
        settle(resolve, reject, response);
      } else {
        const responseBuffer = [];
        let totalResponseBytes = 0;
        responseStream.on("data", function handleStreamData(chunk) {
          responseBuffer.push(chunk);
          totalResponseBytes += chunk.length;
          if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
            rejected = true;
            responseStream.destroy();
            abort(new AxiosError_default("maxContentLength size of " + config.maxContentLength + " exceeded", AxiosError_default.ERR_BAD_RESPONSE, config, lastRequest));
          }
        });
        responseStream.on("aborted", function handlerStreamAborted() {
          if (rejected) {
            return;
          }
          const err = new AxiosError_default("stream has been aborted", AxiosError_default.ERR_BAD_RESPONSE, config, lastRequest);
          responseStream.destroy(err);
          reject(err);
        });
        responseStream.on("error", function handleStreamError(err) {
          if (req.destroyed)
            return;
          reject(AxiosError_default.from(err, null, config, lastRequest));
        });
        responseStream.on("end", function handleStreamEnd() {
          try {
            let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
            if (responseType !== "arraybuffer") {
              responseData = responseData.toString(responseEncoding);
              if (!responseEncoding || responseEncoding === "utf8") {
                responseData = utils_default.stripBOM(responseData);
              }
            }
            response.data = responseData;
          } catch (err) {
            return reject(AxiosError_default.from(err, null, config, response.request, response));
          }
          settle(resolve, reject, response);
        });
      }
      abortEmitter.once("abort", (err) => {
        if (!responseStream.destroyed) {
          responseStream.emit("error", err);
          responseStream.destroy();
        }
      });
    });
    abortEmitter.once("abort", (err) => {
      if (req.close) {
        req.close();
      } else {
        req.destroy(err);
      }
    });
    req.on("error", function handleRequestError(err) {
      reject(AxiosError_default.from(err, null, config, req));
    });
    req.on("socket", function handleRequestSocket(socket) {
      socket.setKeepAlive(true, 1000 * 60);
    });
    if (config.timeout) {
      const timeout = parseInt(config.timeout, 10);
      if (Number.isNaN(timeout)) {
        abort(new AxiosError_default("error trying to parse `config.timeout` to int", AxiosError_default.ERR_BAD_OPTION_VALUE, config, req));
        return;
      }
      req.setTimeout(timeout, function handleRequestTimeout() {
        if (isDone)
          return;
        let timeoutErrorMessage = config.timeout ? "timeout of " + config.timeout + "ms exceeded" : "timeout exceeded";
        const transitional = config.transitional || transitional_default;
        if (config.timeoutErrorMessage) {
          timeoutErrorMessage = config.timeoutErrorMessage;
        }
        abort(new AxiosError_default(timeoutErrorMessage, transitional.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED, config, req));
      });
    } else {
      req.setTimeout(0);
    }
    if (utils_default.isStream(data)) {
      let ended = false;
      let errored = false;
      data.on("end", () => {
        ended = true;
      });
      data.once("error", (err) => {
        errored = true;
        req.destroy(err);
      });
      data.on("close", () => {
        if (!ended && !errored) {
          abort(new CanceledError_default("Request stream has been aborted", config, req));
        }
      });
      data.pipe(req);
    } else {
      data && req.write(data);
      req.end();
    }
  });
};

// node_modules/axios/lib/helpers/isURLSameOrigin.js
var isURLSameOrigin_default = platform_default.hasStandardBrowserEnv ? ((origin2, isMSIE) => (url2) => {
  url2 = new URL(url2, platform_default.origin);
  return origin2.protocol === url2.protocol && origin2.host === url2.host && (isMSIE || origin2.port === url2.port);
})(new URL(platform_default.origin), platform_default.navigator && /(msie|trident)/i.test(platform_default.navigator.userAgent)) : () => true;

// node_modules/axios/lib/helpers/cookies.js
var cookies_default = platform_default.hasStandardBrowserEnv ? {
  write(name, value, expires, path, domain, secure, sameSite) {
    if (typeof document === "undefined")
      return;
    const cookie = [`${name}=${encodeURIComponent(value)}`];
    if (utils_default.isNumber(expires)) {
      cookie.push(`expires=${new Date(expires).toUTCString()}`);
    }
    if (utils_default.isString(path)) {
      cookie.push(`path=${path}`);
    }
    if (utils_default.isString(domain)) {
      cookie.push(`domain=${domain}`);
    }
    if (secure === true) {
      cookie.push("secure");
    }
    if (utils_default.isString(sameSite)) {
      cookie.push(`SameSite=${sameSite}`);
    }
    document.cookie = cookie.join("; ");
  },
  read(name) {
    if (typeof document === "undefined")
      return null;
    const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  },
  remove(name) {
    this.write(name, "", Date.now() - 86400000, "/");
  }
} : {
  write() {},
  read() {
    return null;
  },
  remove() {}
};

// node_modules/axios/lib/core/mergeConfig.js
var headersToObject = (thing) => thing instanceof AxiosHeaders_default ? { ...thing } : thing;
function mergeConfig(config1, config2) {
  config2 = config2 || {};
  const config = {};
  function getMergedValue(target, source, prop, caseless) {
    if (utils_default.isPlainObject(target) && utils_default.isPlainObject(source)) {
      return utils_default.merge.call({ caseless }, target, source);
    } else if (utils_default.isPlainObject(source)) {
      return utils_default.merge({}, source);
    } else if (utils_default.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(undefined, a, prop, caseless);
    }
  }
  function valueFromConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(undefined, b);
    }
  }
  function defaultToConfig2(a, b) {
    if (!utils_default.isUndefined(b)) {
      return getMergedValue(undefined, b);
    } else if (!utils_default.isUndefined(a)) {
      return getMergedValue(undefined, a);
    }
  }
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(undefined, a);
    }
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };
  utils_default.forEach(Object.keys({ ...config1, ...config2 }), function computeConfigValue(prop) {
    if (prop === "__proto__" || prop === "constructor" || prop === "prototype")
      return;
    const merge2 = utils_default.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
    const configValue = merge2(config1[prop], config2[prop], prop);
    utils_default.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
  });
  return config;
}

// node_modules/axios/lib/helpers/resolveConfig.js
var resolveConfig_default = (config) => {
  const newConfig = mergeConfig({}, config);
  let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
  newConfig.headers = headers = AxiosHeaders_default.from(headers);
  newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);
  if (auth) {
    headers.set("Authorization", "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : "")));
  }
  if (utils_default.isFormData(data)) {
    if (platform_default.hasStandardBrowserEnv || platform_default.hasStandardBrowserWebWorkerEnv) {
      headers.setContentType(undefined);
    } else if (utils_default.isFunction(data.getHeaders)) {
      const formHeaders = data.getHeaders();
      const allowedHeaders = ["content-type", "content-length"];
      Object.entries(formHeaders).forEach(([key, val]) => {
        if (allowedHeaders.includes(key.toLowerCase())) {
          headers.set(key, val);
        }
      });
    }
  }
  if (platform_default.hasStandardBrowserEnv) {
    withXSRFToken && utils_default.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
    if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin_default(newConfig.url)) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies_default.read(xsrfCookieName);
      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }
  return newConfig;
};

// node_modules/axios/lib/adapters/xhr.js
var isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
var xhr_default = isXHRAdapterSupported && function(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig_default(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders_default.from(_config.headers).normalize();
    let { responseType, onUploadProgress, onDownloadProgress } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;
    function done() {
      flushUpload && flushUpload();
      flushDownload && flushDownload();
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener("abort", onCanceled);
    }
    let request = new XMLHttpRequest;
    request.open(_config.method.toUpperCase(), _config.url, true);
    request.timeout = _config.timeout;
    function onloadend() {
      if (!request) {
        return;
      }
      const responseHeaders = AxiosHeaders_default.from("getAllResponseHeaders" in request && request.getAllResponseHeaders());
      const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);
      request = null;
    }
    if ("onloadend" in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
          return;
        }
        setTimeout(onloadend);
      };
    }
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }
      reject(new AxiosError_default("Request aborted", AxiosError_default.ECONNABORTED, config, request));
      request = null;
    };
    request.onerror = function handleError(event) {
      const msg = event && event.message ? event.message : "Network Error";
      const err = new AxiosError_default(msg, AxiosError_default.ERR_NETWORK, config, request);
      err.event = event || null;
      reject(err);
      request = null;
    };
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
      const transitional = _config.transitional || transitional_default;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(new AxiosError_default(timeoutErrorMessage, transitional.clarifyTimeoutError ? AxiosError_default.ETIMEDOUT : AxiosError_default.ECONNABORTED, config, request));
      request = null;
    };
    requestData === undefined && requestHeaders.setContentType(null);
    if ("setRequestHeader" in request) {
      utils_default.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }
    if (!utils_default.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }
    if (responseType && responseType !== "json") {
      request.responseType = _config.responseType;
    }
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
      request.addEventListener("progress", downloadThrottled);
    }
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
      request.upload.addEventListener("progress", uploadThrottled);
      request.upload.addEventListener("loadend", flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      onCanceled = (cancel) => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError_default(null, config, request) : cancel);
        request.abort();
        request = null;
      };
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
      }
    }
    const protocol = parseProtocol(_config.url);
    if (protocol && platform_default.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError_default("Unsupported protocol " + protocol + ":", AxiosError_default.ERR_BAD_REQUEST, config));
      return;
    }
    request.send(requestData || null);
  });
};

// node_modules/axios/lib/helpers/composeSignals.js
var composeSignals = (signals, timeout) => {
  const { length } = signals = signals ? signals.filter(Boolean) : [];
  if (timeout || length) {
    let controller = new AbortController;
    let aborted;
    const onabort = function(reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError_default ? err : new CanceledError_default(err instanceof Error ? err.message : err));
      }
    };
    let timer = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError_default(`timeout of ${timeout}ms exceeded`, AxiosError_default.ETIMEDOUT));
    }, timeout);
    const unsubscribe = () => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach((signal2) => {
          signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
        });
        signals = null;
      }
    };
    signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
    const { signal } = controller;
    signal.unsubscribe = () => utils_default.asap(unsubscribe);
    return signal;
  }
};
var composeSignals_default = composeSignals;

// node_modules/axios/lib/helpers/trackStream.js
var streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (!chunkSize || len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
var readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
};
var readStream = async function* (stream4) {
  if (stream4[Symbol.asyncIterator]) {
    yield* stream4;
    return;
  }
  const reader = stream4.getReader();
  try {
    for (;; ) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};
var trackStream = (stream4, chunkSize, onProgress, onFinish) => {
  const iterator2 = readBytes(stream4, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done: done2, value } = await iterator2.next();
        if (done2) {
          _onFinish();
          controller.close();
          return;
        }
        let len = value.byteLength;
        if (onProgress) {
          let loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator2.return();
    }
  }, {
    highWaterMark: 2
  });
};

// node_modules/axios/lib/adapters/fetch.js
var DEFAULT_CHUNK_SIZE = 64 * 1024;
var { isFunction: isFunction2 } = utils_default;
var globalFetchAPI = (({ Request, Response }) => ({
  Request,
  Response
}))(utils_default.global);
var {
  ReadableStream: ReadableStream2,
  TextEncoder: TextEncoder2
} = utils_default.global;
var test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};
var factory = (env) => {
  env = utils_default.merge.call({
    skipUndefined: true
  }, globalFetchAPI, env);
  const { fetch: envFetch, Request, Response } = env;
  const isFetchSupported = envFetch ? isFunction2(envFetch) : typeof fetch === "function";
  const isRequestSupported = isFunction2(Request);
  const isResponseSupported = isFunction2(Response);
  if (!isFetchSupported) {
    return false;
  }
  const isReadableStreamSupported = isFetchSupported && isFunction2(ReadableStream2);
  const encodeText = isFetchSupported && (typeof TextEncoder2 === "function" ? ((encoder) => (str) => encoder.encode(str))(new TextEncoder2) : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));
  const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
    let duplexAccessed = false;
    const hasContentType = new Request(platform_default.origin, {
      body: new ReadableStream2,
      method: "POST",
      get duplex() {
        duplexAccessed = true;
        return "half";
      }
    }).headers.has("Content-Type");
    return duplexAccessed && !hasContentType;
  });
  const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils_default.isReadableStream(new Response("").body));
  const resolvers = {
    stream: supportsResponseStream && ((res) => res.body)
  };
  isFetchSupported && (() => {
    ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
      !resolvers[type] && (resolvers[type] = (res, config) => {
        let method = res && res[type];
        if (method) {
          return method.call(res);
        }
        throw new AxiosError_default(`Response type '${type}' is not supported`, AxiosError_default.ERR_NOT_SUPPORT, config);
      });
    });
  })();
  const getBodyLength = async (body) => {
    if (body == null) {
      return 0;
    }
    if (utils_default.isBlob(body)) {
      return body.size;
    }
    if (utils_default.isSpecCompliantForm(body)) {
      const _request = new Request(platform_default.origin, {
        method: "POST",
        body
      });
      return (await _request.arrayBuffer()).byteLength;
    }
    if (utils_default.isArrayBufferView(body) || utils_default.isArrayBuffer(body)) {
      return body.byteLength;
    }
    if (utils_default.isURLSearchParams(body)) {
      body = body + "";
    }
    if (utils_default.isString(body)) {
      return (await encodeText(body)).byteLength;
    }
  };
  const resolveBodyLength = async (headers, body) => {
    const length = utils_default.toFiniteNumber(headers.getContentLength());
    return length == null ? getBodyLength(body) : length;
  };
  return async (config) => {
    let {
      url: url2,
      method,
      data,
      signal,
      cancelToken,
      timeout,
      onDownloadProgress,
      onUploadProgress,
      responseType,
      headers,
      withCredentials = "same-origin",
      fetchOptions
    } = resolveConfig_default(config);
    let _fetch = envFetch || fetch;
    responseType = responseType ? (responseType + "").toLowerCase() : "text";
    let composedSignal = composeSignals_default([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
    let request = null;
    const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
      composedSignal.unsubscribe();
    });
    let requestContentLength;
    try {
      if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
        let _request = new Request(url2, {
          method: "POST",
          body: data,
          duplex: "half"
        });
        let contentTypeHeader;
        if (utils_default.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
          headers.setContentType(contentTypeHeader);
        }
        if (_request.body) {
          const [onProgress, flush] = progressEventDecorator(requestContentLength, progressEventReducer(asyncDecorator(onUploadProgress)));
          data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
        }
      }
      if (!utils_default.isString(withCredentials)) {
        withCredentials = withCredentials ? "include" : "omit";
      }
      const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;
      const resolvedOptions = {
        ...fetchOptions,
        signal: composedSignal,
        method: method.toUpperCase(),
        headers: headers.normalize().toJSON(),
        body: data,
        duplex: "half",
        credentials: isCredentialsSupported ? withCredentials : undefined
      };
      request = isRequestSupported && new Request(url2, resolvedOptions);
      let response = await (isRequestSupported ? _fetch(request, fetchOptions) : _fetch(url2, resolvedOptions));
      const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
      if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
        const options = {};
        ["status", "statusText", "headers"].forEach((prop) => {
          options[prop] = response[prop];
        });
        const responseContentLength = utils_default.toFiniteNumber(response.headers.get("content-length"));
        const [onProgress, flush] = onDownloadProgress && progressEventDecorator(responseContentLength, progressEventReducer(asyncDecorator(onDownloadProgress), true)) || [];
        response = new Response(trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
          flush && flush();
          unsubscribe && unsubscribe();
        }), options);
      }
      responseType = responseType || "text";
      let responseData = await resolvers[utils_default.findKey(resolvers, responseType) || "text"](response, config);
      !isStreamResponse && unsubscribe && unsubscribe();
      return await new Promise((resolve, reject) => {
        settle(resolve, reject, {
          data: responseData,
          headers: AxiosHeaders_default.from(response.headers),
          status: response.status,
          statusText: response.statusText,
          config,
          request
        });
      });
    } catch (err) {
      unsubscribe && unsubscribe();
      if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
        throw Object.assign(new AxiosError_default("Network Error", AxiosError_default.ERR_NETWORK, config, request, err && err.response), {
          cause: err.cause || err
        });
      }
      throw AxiosError_default.from(err, err && err.code, config, request, err && err.response);
    }
  };
};
var seedCache = new Map;
var getFetch = (config) => {
  let env = config && config.env || {};
  const { fetch: fetch2, Request, Response } = env;
  const seeds = [
    Request,
    Response,
    fetch2
  ];
  let len = seeds.length, i = len, seed, target, map = seedCache;
  while (i--) {
    seed = seeds[i];
    target = map.get(seed);
    target === undefined && map.set(seed, target = i ? new Map : factory(env));
    map = target;
  }
  return target;
};
var adapter = getFetch();

// node_modules/axios/lib/adapters/adapters.js
var knownAdapters = {
  http: http_default,
  xhr: xhr_default,
  fetch: {
    get: getFetch
  }
};
utils_default.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { value });
    } catch (e) {}
    Object.defineProperty(fn, "adapterName", { value });
  }
});
var renderReason = (reason) => `- ${reason}`;
var isResolvedHandle = (adapter2) => utils_default.isFunction(adapter2) || adapter2 === null || adapter2 === false;
function getAdapter(adapters, config) {
  adapters = utils_default.isArray(adapters) ? adapters : [adapters];
  const { length } = adapters;
  let nameOrAdapter;
  let adapter2;
  const rejectedReasons = {};
  for (let i = 0;i < length; i++) {
    nameOrAdapter = adapters[i];
    let id;
    adapter2 = nameOrAdapter;
    if (!isResolvedHandle(nameOrAdapter)) {
      adapter2 = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
      if (adapter2 === undefined) {
        throw new AxiosError_default(`Unknown adapter '${id}'`);
      }
    }
    if (adapter2 && (utils_default.isFunction(adapter2) || (adapter2 = adapter2.get(config)))) {
      break;
    }
    rejectedReasons[id || "#" + i] = adapter2;
  }
  if (!adapter2) {
    const reasons = Object.entries(rejectedReasons).map(([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build"));
    let s = length ? reasons.length > 1 ? `since :
` + reasons.map(renderReason).join(`
`) : " " + renderReason(reasons[0]) : "as no adapter specified";
    throw new AxiosError_default(`There is no suitable adapter to dispatch the request ` + s, "ERR_NOT_SUPPORT");
  }
  return adapter2;
}
var adapters_default = {
  getAdapter,
  adapters: knownAdapters
};

// node_modules/axios/lib/core/dispatchRequest.js
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError_default(null, config);
  }
}
function dispatchRequest(config) {
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders_default.from(config.headers);
  config.data = transformData.call(config, config.transformRequest);
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter2 = adapters_default.getAdapter(config.adapter || defaults_default.adapter, config);
  return adapter2(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);
    response.data = transformData.call(config, config.transformResponse, response);
    response.headers = AxiosHeaders_default.from(response.headers);
    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);
      if (reason && reason.response) {
        reason.response.data = transformData.call(config, config.transformResponse, reason.response);
        reason.response.headers = AxiosHeaders_default.from(reason.response.headers);
      }
    }
    return Promise.reject(reason);
  });
}

// node_modules/axios/lib/helpers/validator.js
var validators = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
  validators[type] = function validator(thing) {
    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
  };
});
var deprecatedWarnings = {};
validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  return (value, opt, opts) => {
    if (validator === false) {
      throw new AxiosError_default(formatMessage(opt, " has been removed" + (version ? " in " + version : "")), AxiosError_default.ERR_DEPRECATED);
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(formatMessage(opt, " has been deprecated since v" + version + " and will be removed in the near future"));
    }
    return validator ? validator(value, opt, opts) : true;
  };
};
validators.spelling = function spelling(correctSpelling) {
  return (value, opt) => {
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  };
};
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object") {
    throw new AxiosError_default("options must be an object", AxiosError_default.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    if (validator) {
      const value = options[opt];
      const result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError_default("option " + opt + " must be " + result, AxiosError_default.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError_default("Unknown option " + opt, AxiosError_default.ERR_BAD_OPTION);
    }
  }
}
var validator_default = {
  assertOptions,
  validators
};

// node_modules/axios/lib/core/Axios.js
var validators2 = validator_default.validators;

class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager_default,
      response: new InterceptorManager_default
    };
  }
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {};
        Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error;
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
        try {
          if (!err.stack) {
            err.stack = stack;
          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
            err.stack += `
` + stack;
          }
        } catch (e) {}
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }
    config = mergeConfig(this.defaults, config);
    const { transitional: transitional2, paramsSerializer, headers } = config;
    if (transitional2 !== undefined) {
      validator_default.assertOptions(transitional2, {
        silentJSONParsing: validators2.transitional(validators2.boolean),
        forcedJSONParsing: validators2.transitional(validators2.boolean),
        clarifyTimeoutError: validators2.transitional(validators2.boolean),
        legacyInterceptorReqResOrdering: validators2.transitional(validators2.boolean)
      }, false);
    }
    if (paramsSerializer != null) {
      if (utils_default.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator_default.assertOptions(paramsSerializer, {
          encode: validators2.function,
          serialize: validators2.function
        }, true);
      }
    }
    if (config.allowAbsoluteUrls !== undefined) {} else if (this.defaults.allowAbsoluteUrls !== undefined) {
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      config.allowAbsoluteUrls = true;
    }
    validator_default.assertOptions(config, {
      baseUrl: validators2.spelling("baseURL"),
      withXsrfToken: validators2.spelling("withXSRFToken")
    }, true);
    config.method = (config.method || this.defaults.method || "get").toLowerCase();
    let contextHeaders = headers && utils_default.merge(headers.common, headers[config.method]);
    headers && utils_default.forEach(["delete", "get", "head", "post", "put", "patch", "common"], (method) => {
      delete headers[method];
    });
    config.headers = AxiosHeaders_default.concat(contextHeaders, headers);
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
        return;
      }
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      const transitional3 = config.transitional || transitional_default;
      const legacyInterceptorReqResOrdering = transitional3 && transitional3.legacyInterceptorReqResOrdering;
      if (legacyInterceptorReqResOrdering) {
        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      } else {
        requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      }
    });
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), undefined];
      chain.unshift(...requestInterceptorChain);
      chain.push(...responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }
    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }
    return promise;
  }
  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}
utils_default.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
  Axios.prototype[method] = function(url2, config) {
    return this.request(mergeConfig(config || {}, {
      method,
      url: url2,
      data: (config || {}).data
    }));
  };
});
utils_default.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url2, data, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        headers: isForm ? {
          "Content-Type": "multipart/form-data"
        } : {},
        url: url2,
        data
      }));
    };
  }
  Axios.prototype[method] = generateHTTPMethod();
  Axios.prototype[method + "Form"] = generateHTTPMethod(true);
});
var Axios_default = Axios;

// node_modules/axios/lib/cancel/CancelToken.js
class CancelToken {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("executor must be a function.");
    }
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });
    const token = this;
    this.promise.then((cancel) => {
      if (!token._listeners)
        return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };
      return promise;
    };
    executor(function cancel(message, config, request) {
      if (token.reason) {
        return;
      }
      token.reason = new CanceledError_default(message, config, request);
      resolvePromise(token.reason);
    });
  }
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }
  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }
  toAbortSignal() {
    const controller = new AbortController;
    const abort = (err) => {
      controller.abort(err);
    };
    this.subscribe(abort);
    controller.signal.unsubscribe = () => this.unsubscribe(abort);
    return controller.signal;
  }
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
}
var CancelToken_default = CancelToken;

// node_modules/axios/lib/helpers/spread.js
function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}

// node_modules/axios/lib/helpers/isAxiosError.js
function isAxiosError(payload) {
  return utils_default.isObject(payload) && payload.isAxiosError === true;
}

// node_modules/axios/lib/helpers/HttpStatusCode.js
var HttpStatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(HttpStatusCode).forEach(([key, value]) => {
  HttpStatusCode[value] = key;
});
var HttpStatusCode_default = HttpStatusCode;

// node_modules/axios/lib/axios.js
function createInstance(defaultConfig) {
  const context = new Axios_default(defaultConfig);
  const instance = bind(Axios_default.prototype.request, context);
  utils_default.extend(instance, Axios_default.prototype, context, { allOwnKeys: true });
  utils_default.extend(instance, context, null, { allOwnKeys: true });
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };
  return instance;
}
var axios = createInstance(defaults_default);
axios.Axios = Axios_default;
axios.CanceledError = CanceledError_default;
axios.CancelToken = CancelToken_default;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData_default;
axios.AxiosError = AxiosError_default;
axios.Cancel = axios.CanceledError;
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread;
axios.isAxiosError = isAxiosError;
axios.mergeConfig = mergeConfig;
axios.AxiosHeaders = AxiosHeaders_default;
axios.formToJSON = (thing) => formDataToJSON_default(utils_default.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters_default.getAdapter;
axios.HttpStatusCode = HttpStatusCode_default;
axios.default = axios;
var axios_default = axios;

// node_modules/@massive.com/client-js/dist/main.js
var import_websocket = __toESM(require_websocket(), 1);
var D = "https://api.massive.com".replace(/\/+$/, "");
var Gn = class {
  constructor(e, t = D, i = axios_default) {
    this.basePath = t;
    this.axios = i;
    e && (this.configuration = e, this.basePath = e.basePath ?? t);
  }
};
var On = class extends Error {
  constructor(t, i) {
    super(i);
    this.field = t;
    this.name = "RequiredError";
  }
};
var F = {};
var B = "https://example.com";
var Y = function(a, e, t) {
  if (t == null)
    throw new On(e, `Required parameter ${e} was null or undefined when calling ${a}.`);
};
var U = async function(a, e, t) {
  if (t && t.apiKey) {
    let i = typeof t.apiKey == "function" ? await t.apiKey(e) : await t.apiKey;
    a[e] = i;
  }
};
function vn(a, e, t = "") {
  e != null && (typeof e == "object" ? Array.isArray(e) ? e.forEach((i) => vn(a, i, t)) : Object.keys(e).forEach((i) => vn(a, e[i], `${t}${t !== "" ? "." : ""}${i}`)) : a.has(t) ? a.append(t, e) : a.set(t, e));
}
var z = function(a, ...e) {
  let t = new URLSearchParams(a.search);
  vn(t, e), a.search = t.toString();
};
var E = function(a) {
  return a.pathname + a.search + a.hash;
};
var Q = function(a, e, t, i) {
  return (n = e, s = t) => {
    let o = { ...a.options, url: (n.defaults.baseURL ? "" : i?.basePath ?? s) + a.url };
    return n.request(o);
  };
};
var Qn = ((o) => (o.Q = "Q", o.T = "T", o.Qa = "QA", o.Ta = "TA", o.Y = "Y", o.Ya = "YA", o))(Qn || {});
var Mn = ((e) => (e.Ok = "OK", e))(Mn || {});
var Hn = ((e) => (e.Error = "ERROR", e))(Hn || {});
var jn = ((e) => (e.Ok = "OK", e))(jn || {});
var Kn = ((e) => (e.Ok = "OK", e))(Kn || {});
var Nn = ((e) => (e.Ok = "OK", e))(Nn || {});
var $n = ((e) => (e.Ok = "OK", e))($n || {});
var Yn = ((e) => (e.Ok = "OK", e))(Yn || {});
var Wn = ((e) => (e.Ok = "OK", e))(Wn || {});
var Xn = ((e) => (e.Ok = "OK", e))(Xn || {});
var Jn = ((e) => (e.Ok = "OK", e))(Jn || {});
var Zn = ((e) => (e.Ok = "OK", e))(Zn || {});
var qn = ((e) => (e.Ok = "OK", e))(qn || {});
var Pn = ((e) => (e.Ok = "OK", e))(Pn || {});
var et = ((e) => (e.Ok = "OK", e))(et || {});
var nt = ((e) => (e.Ok = "OK", e))(nt || {});
var tt = ((e) => (e.Ok = "OK", e))(tt || {});
var it = ((e) => (e.Ok = "OK", e))(it || {});
var st = ((e) => (e.Ok = "OK", e))(st || {});
var ot = ((e) => (e.Ok = "OK", e))(ot || {});
var rt = ((e) => (e.Ok = "OK", e))(rt || {});
var at = ((e) => (e.Ok = "OK", e))(at || {});
var dt = ((e) => (e.Ok = "OK", e))(dt || {});
var lt = ((e) => (e.Ok = "OK", e))(lt || {});
var gt = ((e) => (e.Ok = "OK", e))(gt || {});
var ct = ((e) => (e.Ok = "OK", e))(ct || {});
var pt = ((e) => (e.Ok = "OK", e))(pt || {});
var ft = ((e) => (e.Ok = "OK", e))(ft || {});
var ut = ((t) => (t.Delayed = "DELAYED", t.RealTime = "REAL-TIME", t))(ut || {});
var yt = ((e) => (e.Indices = "indices", e))(yt || {});
var bt = ((i) => (i.Put = "put", i.Call = "call", i.Other = "other", i))(bt || {});
var mt = ((i) => (i.American = "american", i.European = "european", i.Bermudan = "bermudan", i))(mt || {});
var ht = ((t) => (t.Delayed = "DELAYED", t.RealTime = "REAL-TIME", t))(ht || {});
var Rt = ((t) => (t.Delayed = "DELAYED", t.RealTime = "REAL-TIME", t))(Rt || {});
var xt = ((e) => (e.Ok = "OK", e))(xt || {});
var At = ((n) => (n.Stocks = "stocks", n.Crypto = "crypto", n.Options = "options", n.Fx = "fx", n))(At || {});
var kt = ((i) => (i.Put = "put", i.Call = "call", i.Other = "other", i))(kt || {});
var _t = ((i) => (i.American = "american", i.European = "european", i.Bermudan = "bermudan", i))(_t || {});
var Gt = ((t) => (t.Delayed = "DELAYED", t.RealTime = "REAL-TIME", t))(Gt || {});
var Ot = ((s) => (s.Stocks = "stocks", s.Options = "options", s.Fx = "fx", s.Crypto = "crypto", s.Indices = "indices", s))(Ot || {});
var Ct = ((i) => (i.Put = "put", i.Call = "call", i.Other = "other", i))(Ct || {});
var Vt = ((i) => (i.American = "american", i.European = "european", i.Bermudan = "bermudan", i))(Vt || {});
var St = ((t) => (t.Delayed = "DELAYED", t.RealTime = "REAL-TIME", t))(St || {});
var wt = ((t) => (t.Delayed = "DELAYED", t.RealTime = "REAL-TIME", t))(wt || {});
var vt = ((t) => (t.Delayed = "DELAYED", t.RealTime = "REAL-TIME", t))(vt || {});
var It = ((e) => (e.Ok = "OK", e))(It || {});
var Lt = ((e) => (e.Ok = "OK", e))(Lt || {});
var Tt = ((e) => (e.Ok = "OK", e))(Tt || {});
var Dt = ((e) => (e.Ok = "OK", e))(Dt || {});
var Ft = ((e) => (e.Ok = "OK", e))(Ft || {});
var Bt = ((e) => (e.Ok = "OK", e))(Bt || {});
var Ut = ((e) => (e.Ok = "OK", e))(Ut || {});
var zt = ((e) => (e.Ok = "OK", e))(zt || {});
var Et = ((e) => (e.Ok = "OK", e))(Et || {});
var Qt = ((e) => (e.Ok = "OK", e))(Qt || {});
var Mt = ((e) => (e.Ok = "OK", e))(Mt || {});
var Ht = ((e) => (e.Ok = "OK", e))(Ht || {});
var jt = ((e) => (e.Ok = "OK", e))(jt || {});
var Kt = ((t) => (t.Us = "us", t.Global = "global", t))(Kt || {});
var Nt = ((s) => (s.Stocks = "stocks", s.Crypto = "crypto", s.Fx = "fx", s.Otc = "otc", s.Indices = "indices", s))(Nt || {});
var $t = ((e) => (e.Ok = "OK", e))($t || {});
var Yt = ((n) => (n.Stocks = "stocks", n.Options = "options", n.Crypto = "crypto", n.Fx = "fx", n))(Yt || {});
var Wt = ((i) => (i.Trade = "trade", i.Bbo = "bbo", i.Nbbo = "nbbo", i))(Wt || {});
var Xt = ((d) => (d.SaleCondition = "sale_condition", d.QuoteCondition = "quote_condition", d.SipGeneratedFlag = "sip_generated_flag", d.FinancialStatusIndicator = "financial_status_indicator", d.ShortSaleRestrictionIndicator = "short_sale_restriction_indicator", d.SettlementCondition = "settlement_condition", d.MarketCondition = "market_condition", d.TradeThruExempt = "trade_thru_exempt", d))(Xt || {});
var Jt = ((n) => (n.Cd = "CD", n.Sc = "SC", n.Lt = "LT", n.St = "ST", n))(Jt || {});
var Zt = ((s) => (s.Stocks = "stocks", s.Options = "options", s.Crypto = "crypto", s.Fx = "fx", s.Futures = "futures", s))(Zt || {});
var qt = ((t) => (t.Us = "us", t.Global = "global", t))(qt || {});
var Pt = ((i) => (i.Exchange = "exchange", i.Trf = "TRF", i.Sip = "SIP", i))(Pt || {});
var ei = ((r) => (r.DirectListingProcess = "direct_listing_process", r.History = "history", r.New = "new", r.Pending = "pending", r.Postponed = "postponed", r.Rumor = "rumor", r.Withdrawn = "withdrawn", r))(ei || {});
var ni = ((i) => (i.Positive = "positive", i.Neutral = "neutral", i.Negative = "negative", i))(ni || {});
var ti = ((i) => (i.American = "american", i.European = "european", i.Bermudan = "bermudan", i))(ti || {});
var ii = ((s) => (s.Stocks = "stocks", s.Options = "options", s.Crypto = "crypto", s.Fx = "fx", s.Indices = "indices", s))(ii || {});
var si = ((t) => (t.Us = "us", t.Global = "global", t))(si || {});
var oi = ((t) => (t.Us = "us", t.Global = "global", t))(oi || {});
var ri = ((s) => (s.Stocks = "stocks", s.Crypto = "crypto", s.Fx = "fx", s.Otc = "otc", s.Indices = "indices", s))(ri || {});
var ai = ((n) => (n.String = "string", n.Int = "int", n.Int64 = "int64", n.Float64 = "float64", n))(ai || {});
var di = function(a) {
  return { deprecatedGetCryptoSnapshotTickerBook: async (e, t = {}) => {
    Y("deprecatedGetCryptoSnapshotTickerBook", "ticker", e);
    let i = "/v2/snapshot/locale/global/markets/crypto/tickers/{ticker}/book".replace("{ticker}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, deprecatedGetHistoricCryptoTrades: async (e, t, i, n, s, o = {}) => {
    Y("deprecatedGetHistoricCryptoTrades", "from", e), Y("deprecatedGetHistoricCryptoTrades", "to", t), Y("deprecatedGetHistoricCryptoTrades", "date", i);
    let r = "/v1/historic/crypto/{from}/{to}/{date}".replace("{from}", encodeURIComponent(String(e))).replace("{to}", encodeURIComponent(String(t))).replace("{date}", encodeURIComponent(String(i))), d = new URL(r, B), l;
    a && (l = a.baseOptions);
    let g = { method: "GET", ...l, ...o }, y = {}, p = {};
    await U(p, "apiKey", a), n !== undefined && (p.offset = n), s !== undefined && (p.limit = s), z(d, p);
    let f = l && l.headers ? l.headers : {};
    return g.headers = { ...y, ...f, ...o.headers }, { url: E(d), options: g };
  }, deprecatedGetHistoricForexQuotes: async (e, t, i, n, s, o = {}) => {
    Y("deprecatedGetHistoricForexQuotes", "from", e), Y("deprecatedGetHistoricForexQuotes", "to", t), Y("deprecatedGetHistoricForexQuotes", "date", i);
    let r = "/v1/historic/forex/{from}/{to}/{date}".replace("{from}", encodeURIComponent(String(e))).replace("{to}", encodeURIComponent(String(t))).replace("{date}", encodeURIComponent(String(i))), d = new URL(r, B), l;
    a && (l = a.baseOptions);
    let g = { method: "GET", ...l, ...o }, y = {}, p = {};
    await U(p, "apiKey", a), n !== undefined && (p.offset = n), s !== undefined && (p.limit = s), z(d, p);
    let f = l && l.headers ? l.headers : {};
    return g.headers = { ...y, ...f, ...o.headers }, { url: E(d), options: g };
  }, deprecatedGetHistoricStocksQuotes: async (e, t, i, n, s, o, r = {}) => {
    Y("deprecatedGetHistoricStocksQuotes", "ticker", e), Y("deprecatedGetHistoricStocksQuotes", "date", t);
    let d = "/v2/ticks/stocks/nbbo/{ticker}/{date}".replace("{ticker}", encodeURIComponent(String(e))).replace("{date}", encodeURIComponent(String(t))), l = new URL(d, B), g;
    a && (g = a.baseOptions);
    let y = { method: "GET", ...g, ...r }, p = {}, f = {};
    await U(f, "apiKey", a), i !== undefined && (f.timestamp = i), n !== undefined && (f.timestampLimit = n), s !== undefined && (f.reverse = s), o !== undefined && (f.limit = o), z(l, f);
    let m = g && g.headers ? g.headers : {};
    return y.headers = { ...p, ...m, ...r.headers }, { url: E(l), options: y };
  }, deprecatedGetHistoricStocksTrades: async (e, t, i, n, s, o, r = {}) => {
    Y("deprecatedGetHistoricStocksTrades", "ticker", e), Y("deprecatedGetHistoricStocksTrades", "date", t);
    let d = "/v2/ticks/stocks/trades/{ticker}/{date}".replace("{ticker}", encodeURIComponent(String(e))).replace("{date}", encodeURIComponent(String(t))), l = new URL(d, B), g;
    a && (g = a.baseOptions);
    let y = { method: "GET", ...g, ...r }, p = {}, f = {};
    await U(f, "apiKey", a), i !== undefined && (f.timestamp = i), n !== undefined && (f.timestampLimit = n), s !== undefined && (f.reverse = s), o !== undefined && (f.limit = o), z(l, f);
    let m = g && g.headers ? g.headers : {};
    return y.headers = { ...p, ...m, ...r.headers }, { url: E(l), options: y };
  }, getBenzingaV1AnalystInsights: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce = {}) => {
    let pe = "/benzinga/v1/analyst-insights", fe = new URL(pe, B), de;
    a && (de = a.baseOptions);
    let le = { method: "GET", ...de, ...ce }, ue = {}, X = {};
    await U(X, "apiKey", a), e !== undefined && (X.date = e), t !== undefined && (X["date.any_of"] = t), i !== undefined && (X["date.gt"] = i), n !== undefined && (X["date.gte"] = n), s !== undefined && (X["date.lt"] = s), o !== undefined && (X["date.lte"] = o), r !== undefined && (X.ticker = r), d !== undefined && (X["ticker.any_of"] = d), l !== undefined && (X["ticker.gt"] = l), g !== undefined && (X["ticker.gte"] = g), y !== undefined && (X["ticker.lt"] = y), p !== undefined && (X["ticker.lte"] = p), f !== undefined && (X.last_updated = f), m !== undefined && (X["last_updated.gt"] = m), u !== undefined && (X["last_updated.gte"] = u), b !== undefined && (X["last_updated.lt"] = b), h !== undefined && (X["last_updated.lte"] = h), x !== undefined && (X.firm = x), R !== undefined && (X["firm.any_of"] = R), c !== undefined && (X["firm.gt"] = c), k !== undefined && (X["firm.gte"] = k), A !== undefined && (X["firm.lt"] = A), G !== undefined && (X["firm.lte"] = G), S !== undefined && (X.rating_action = S), C !== undefined && (X["rating_action.any_of"] = C), w !== undefined && (X["rating_action.gt"] = w), O !== undefined && (X["rating_action.gte"] = O), N !== undefined && (X["rating_action.lt"] = N), T !== undefined && (X["rating_action.lte"] = T), K !== undefined && (X.benzinga_firm_id = K), W !== undefined && (X["benzinga_firm_id.any_of"] = W), I !== undefined && (X["benzinga_firm_id.gt"] = I), V !== undefined && (X["benzinga_firm_id.gte"] = V), v !== undefined && (X["benzinga_firm_id.lt"] = v), te !== undefined && (X["benzinga_firm_id.lte"] = te), ee !== undefined && (X.benzinga_rating_id = ee), se !== undefined && (X["benzinga_rating_id.any_of"] = se), ie !== undefined && (X["benzinga_rating_id.gt"] = ie), $ !== undefined && (X["benzinga_rating_id.gte"] = $), oe !== undefined && (X["benzinga_rating_id.lt"] = oe), re !== undefined && (X["benzinga_rating_id.lte"] = re), L !== undefined && (X.limit = L), ae !== undefined && (X.sort = ae), z(fe, X);
    let J = de && de.headers ? de.headers : {};
    return le.headers = { ...ue, ...J, ...ce.headers }, { url: E(fe), options: le };
  }, getBenzingaV1Analysts: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O = {}) => {
    let N = "/benzinga/v1/analysts", T = new URL(N, B), K;
    a && (K = a.baseOptions);
    let W = { method: "GET", ...K, ...O }, I = {}, V = {};
    await U(V, "apiKey", a), e !== undefined && (V.benzinga_id = e), t !== undefined && (V["benzinga_id.any_of"] = t), i !== undefined && (V["benzinga_id.gt"] = i), n !== undefined && (V["benzinga_id.gte"] = n), s !== undefined && (V["benzinga_id.lt"] = s), o !== undefined && (V["benzinga_id.lte"] = o), r !== undefined && (V.benzinga_firm_id = r), d !== undefined && (V["benzinga_firm_id.any_of"] = d), l !== undefined && (V["benzinga_firm_id.gt"] = l), g !== undefined && (V["benzinga_firm_id.gte"] = g), y !== undefined && (V["benzinga_firm_id.lt"] = y), p !== undefined && (V["benzinga_firm_id.lte"] = p), f !== undefined && (V.firm_name = f), m !== undefined && (V["firm_name.any_of"] = m), u !== undefined && (V["firm_name.gt"] = u), b !== undefined && (V["firm_name.gte"] = b), h !== undefined && (V["firm_name.lt"] = h), x !== undefined && (V["firm_name.lte"] = x), R !== undefined && (V.full_name = R), c !== undefined && (V["full_name.any_of"] = c), k !== undefined && (V["full_name.gt"] = k), A !== undefined && (V["full_name.gte"] = A), G !== undefined && (V["full_name.lt"] = G), S !== undefined && (V["full_name.lte"] = S), C !== undefined && (V.limit = C), w !== undefined && (V.sort = w), z(T, V);
    let v = K && K.headers ? K.headers : {};
    return W.headers = { ...I, ...v, ...O.headers }, { url: E(T), options: W };
  }, getBenzingaV1BullsBearsSay: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c = {}) => {
    let k = "/benzinga/v1/bulls-bears-say", A = new URL(k, B), G;
    a && (G = a.baseOptions);
    let S = { method: "GET", ...G, ...c }, C = {}, w = {};
    await U(w, "apiKey", a), e !== undefined && (w.ticker = e), t !== undefined && (w["ticker.any_of"] = t), i !== undefined && (w["ticker.gt"] = i), n !== undefined && (w["ticker.gte"] = n), s !== undefined && (w["ticker.lt"] = s), o !== undefined && (w["ticker.lte"] = o), r !== undefined && (w.benzinga_id = r), d !== undefined && (w["benzinga_id.any_of"] = d), l !== undefined && (w["benzinga_id.gt"] = l), g !== undefined && (w["benzinga_id.gte"] = g), y !== undefined && (w["benzinga_id.lt"] = y), p !== undefined && (w["benzinga_id.lte"] = p), f !== undefined && (w.last_updated = f), m !== undefined && (w["last_updated.gt"] = m), u !== undefined && (w["last_updated.gte"] = u), b !== undefined && (w["last_updated.lt"] = b), h !== undefined && (w["last_updated.lte"] = h), x !== undefined && (w.limit = x), R !== undefined && (w.sort = R), z(A, w);
    let O = G && G.headers ? G.headers : {};
    return S.headers = { ...C, ...O, ...c.headers }, { url: E(A), options: S };
  }, getBenzingaV1ConsensusRatings: async (e, t, i, n, s, o, r, d, l = {}) => {
    Y("getBenzingaV1ConsensusRatings", "ticker", e);
    let g = "/benzinga/v1/consensus-ratings/{ticker}".replace("{ticker}", encodeURIComponent(String(e))), y = new URL(g, B), p;
    a && (p = a.baseOptions);
    let f = { method: "GET", ...p, ...l }, m = {}, u = {};
    await U(u, "apiKey", a), t !== undefined && (u.date = t), i !== undefined && (u["date.any_of"] = i), n !== undefined && (u["date.gt"] = n), s !== undefined && (u["date.gte"] = s), o !== undefined && (u["date.lt"] = o), r !== undefined && (u["date.lte"] = r), d !== undefined && (u.limit = d), z(y, u);
    let b = p && p.headers ? p.headers : {};
    return f.headers = { ...m, ...b, ...l.headers }, { url: E(y), options: f };
  }, getBenzingaV1Earnings: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _, me = {}) => {
    let he = "/benzinga/v1/earnings", xe = new URL(he, B), Re;
    a && (Re = a.baseOptions);
    let P = { method: "GET", ...Re, ...me }, Ae = {}, ne = {};
    await U(ne, "apiKey", a), e !== undefined && (ne.date = e), t !== undefined && (ne["date.any_of"] = t), i !== undefined && (ne["date.gt"] = i), n !== undefined && (ne["date.gte"] = n), s !== undefined && (ne["date.lt"] = s), o !== undefined && (ne["date.lte"] = o), r !== undefined && (ne.ticker = r), d !== undefined && (ne["ticker.any_of"] = d), l !== undefined && (ne["ticker.gt"] = l), g !== undefined && (ne["ticker.gte"] = g), y !== undefined && (ne["ticker.lt"] = y), p !== undefined && (ne["ticker.lte"] = p), f !== undefined && (ne.importance = f), m !== undefined && (ne["importance.any_of"] = m), u !== undefined && (ne["importance.gt"] = u), b !== undefined && (ne["importance.gte"] = b), h !== undefined && (ne["importance.lt"] = h), x !== undefined && (ne["importance.lte"] = x), R !== undefined && (ne.last_updated = R), c !== undefined && (ne["last_updated.any_of"] = c), k !== undefined && (ne["last_updated.gt"] = k), A !== undefined && (ne["last_updated.gte"] = A), G !== undefined && (ne["last_updated.lt"] = G), S !== undefined && (ne["last_updated.lte"] = S), C !== undefined && (ne.date_status = C), w !== undefined && (ne["date_status.any_of"] = w), O !== undefined && (ne["date_status.gt"] = O), N !== undefined && (ne["date_status.gte"] = N), T !== undefined && (ne["date_status.lt"] = T), K !== undefined && (ne["date_status.lte"] = K), W !== undefined && (ne.eps_surprise_percent = W), I !== undefined && (ne["eps_surprise_percent.any_of"] = I), V !== undefined && (ne["eps_surprise_percent.gt"] = V), v !== undefined && (ne["eps_surprise_percent.gte"] = v), te !== undefined && (ne["eps_surprise_percent.lt"] = te), ee !== undefined && (ne["eps_surprise_percent.lte"] = ee), se !== undefined && (ne.revenue_surprise_percent = se), ie !== undefined && (ne["revenue_surprise_percent.any_of"] = ie), $ !== undefined && (ne["revenue_surprise_percent.gt"] = $), oe !== undefined && (ne["revenue_surprise_percent.gte"] = oe), re !== undefined && (ne["revenue_surprise_percent.lt"] = re), L !== undefined && (ne["revenue_surprise_percent.lte"] = L), ae !== undefined && (ne.fiscal_year = ae), ce !== undefined && (ne["fiscal_year.any_of"] = ce), pe !== undefined && (ne["fiscal_year.gt"] = pe), fe !== undefined && (ne["fiscal_year.gte"] = fe), de !== undefined && (ne["fiscal_year.lt"] = de), le !== undefined && (ne["fiscal_year.lte"] = le), ue !== undefined && (ne.fiscal_period = ue), X !== undefined && (ne["fiscal_period.any_of"] = X), J !== undefined && (ne["fiscal_period.gt"] = J), ye !== undefined && (ne["fiscal_period.gte"] = ye), ge !== undefined && (ne["fiscal_period.lt"] = ge), be !== undefined && (ne["fiscal_period.lte"] = be), Z !== undefined && (ne.limit = Z), _ !== undefined && (ne.sort = _), z(xe, ne);
    let Ge = Re && Re.headers ? Re.headers : {};
    return P.headers = { ...Ae, ...Ge, ...me.headers }, { url: E(xe), options: P };
  }, getBenzingaV1Firms: async (e, t, i, n, s, o, r, d, l = {}) => {
    let g = "/benzinga/v1/firms", y = new URL(g, B), p;
    a && (p = a.baseOptions);
    let f = { method: "GET", ...p, ...l }, m = {}, u = {};
    await U(u, "apiKey", a), e !== undefined && (u.benzinga_id = e), t !== undefined && (u["benzinga_id.any_of"] = t), i !== undefined && (u["benzinga_id.gt"] = i), n !== undefined && (u["benzinga_id.gte"] = n), s !== undefined && (u["benzinga_id.lt"] = s), o !== undefined && (u["benzinga_id.lte"] = o), r !== undefined && (u.limit = r), d !== undefined && (u.sort = d), z(y, u);
    let b = p && p.headers ? p.headers : {};
    return f.headers = { ...m, ...b, ...l.headers }, { url: E(y), options: f };
  }, getBenzingaV1Guidance: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe = {}) => {
    let fe = "/benzinga/v1/guidance", de = new URL(fe, B), le;
    a && (le = a.baseOptions);
    let ue = { method: "GET", ...le, ...pe }, X = {}, J = {};
    await U(J, "apiKey", a), e !== undefined && (J.date = e), t !== undefined && (J["date.any_of"] = t), i !== undefined && (J["date.gt"] = i), n !== undefined && (J["date.gte"] = n), s !== undefined && (J["date.lt"] = s), o !== undefined && (J["date.lte"] = o), r !== undefined && (J.ticker = r), d !== undefined && (J["ticker.any_of"] = d), l !== undefined && (J["ticker.gt"] = l), g !== undefined && (J["ticker.gte"] = g), y !== undefined && (J["ticker.lt"] = y), p !== undefined && (J["ticker.lte"] = p), f !== undefined && (J.positioning = f), m !== undefined && (J["positioning.any_of"] = m), u !== undefined && (J["positioning.gt"] = u), b !== undefined && (J["positioning.gte"] = b), h !== undefined && (J["positioning.lt"] = h), x !== undefined && (J["positioning.lte"] = x), R !== undefined && (J.importance = R), c !== undefined && (J["importance.any_of"] = c), k !== undefined && (J["importance.gt"] = k), A !== undefined && (J["importance.gte"] = A), G !== undefined && (J["importance.lt"] = G), S !== undefined && (J["importance.lte"] = S), C !== undefined && (J.last_updated = C), w !== undefined && (J["last_updated.any_of"] = w), O !== undefined && (J["last_updated.gt"] = O), N !== undefined && (J["last_updated.gte"] = N), T !== undefined && (J["last_updated.lt"] = T), K !== undefined && (J["last_updated.lte"] = K), W !== undefined && (J.fiscal_year = W), I !== undefined && (J["fiscal_year.any_of"] = I), V !== undefined && (J["fiscal_year.gt"] = V), v !== undefined && (J["fiscal_year.gte"] = v), te !== undefined && (J["fiscal_year.lt"] = te), ee !== undefined && (J["fiscal_year.lte"] = ee), se !== undefined && (J.fiscal_period = se), ie !== undefined && (J["fiscal_period.any_of"] = ie), $ !== undefined && (J["fiscal_period.gt"] = $), oe !== undefined && (J["fiscal_period.gte"] = oe), re !== undefined && (J["fiscal_period.lt"] = re), L !== undefined && (J["fiscal_period.lte"] = L), ae !== undefined && (J.limit = ae), ce !== undefined && (J.sort = ce), z(de, J);
    let ye = le && le.headers ? le.headers : {};
    return ue.headers = { ...X, ...ye, ...pe.headers }, { url: E(de), options: ue };
  }, getBenzingaV1Ratings: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z = {}) => {
    let _ = "/benzinga/v1/ratings", me = new URL(_, B), he;
    a && (he = a.baseOptions);
    let xe = { method: "GET", ...he, ...Z }, Re = {}, P = {};
    await U(P, "apiKey", a), e !== undefined && (P.date = e), t !== undefined && (P["date.any_of"] = t), i !== undefined && (P["date.gt"] = i), n !== undefined && (P["date.gte"] = n), s !== undefined && (P["date.lt"] = s), o !== undefined && (P["date.lte"] = o), r !== undefined && (P.ticker = r), d !== undefined && (P["ticker.any_of"] = d), l !== undefined && (P["ticker.gt"] = l), g !== undefined && (P["ticker.gte"] = g), y !== undefined && (P["ticker.lt"] = y), p !== undefined && (P["ticker.lte"] = p), f !== undefined && (P.importance = f), m !== undefined && (P["importance.gt"] = m), u !== undefined && (P["importance.gte"] = u), b !== undefined && (P["importance.lt"] = b), h !== undefined && (P["importance.lte"] = h), x !== undefined && (P.last_updated = x), R !== undefined && (P["last_updated.gt"] = R), c !== undefined && (P["last_updated.gte"] = c), k !== undefined && (P["last_updated.lt"] = k), A !== undefined && (P["last_updated.lte"] = A), G !== undefined && (P.rating_action = G), S !== undefined && (P["rating_action.any_of"] = S), C !== undefined && (P["rating_action.gt"] = C), w !== undefined && (P["rating_action.gte"] = w), O !== undefined && (P["rating_action.lt"] = O), N !== undefined && (P["rating_action.lte"] = N), T !== undefined && (P.price_target_action = T), K !== undefined && (P["price_target_action.any_of"] = K), W !== undefined && (P["price_target_action.gt"] = W), I !== undefined && (P["price_target_action.gte"] = I), V !== undefined && (P["price_target_action.lt"] = V), v !== undefined && (P["price_target_action.lte"] = v), te !== undefined && (P.benzinga_id = te), ee !== undefined && (P["benzinga_id.any_of"] = ee), se !== undefined && (P["benzinga_id.gt"] = se), ie !== undefined && (P["benzinga_id.gte"] = ie), $ !== undefined && (P["benzinga_id.lt"] = $), oe !== undefined && (P["benzinga_id.lte"] = oe), re !== undefined && (P.benzinga_analyst_id = re), L !== undefined && (P["benzinga_analyst_id.any_of"] = L), ae !== undefined && (P["benzinga_analyst_id.gt"] = ae), ce !== undefined && (P["benzinga_analyst_id.gte"] = ce), pe !== undefined && (P["benzinga_analyst_id.lt"] = pe), fe !== undefined && (P["benzinga_analyst_id.lte"] = fe), de !== undefined && (P.benzinga_firm_id = de), le !== undefined && (P["benzinga_firm_id.any_of"] = le), ue !== undefined && (P["benzinga_firm_id.gt"] = ue), X !== undefined && (P["benzinga_firm_id.gte"] = X), J !== undefined && (P["benzinga_firm_id.lt"] = J), ye !== undefined && (P["benzinga_firm_id.lte"] = ye), ge !== undefined && (P.limit = ge), be !== undefined && (P.sort = be), z(me, P);
    let Ae = he && he.headers ? he.headers : {};
    return xe.headers = { ...Re, ...Ae, ...Z.headers }, { url: E(me), options: xe };
  }, getBenzingaV2News: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w = {}) => {
    let O = "/benzinga/v2/news", N = new URL(O, B), T;
    a && (T = a.baseOptions);
    let K = { method: "GET", ...T, ...w }, W = {}, I = {};
    await U(I, "apiKey", a), e !== undefined && (I.published = e), t !== undefined && (I["published.gt"] = t), i !== undefined && (I["published.gte"] = i), n !== undefined && (I["published.lt"] = n), s !== undefined && (I["published.lte"] = s), o !== undefined && (I.channels = o), r !== undefined && (I["channels.all_of"] = r), d !== undefined && (I["channels.any_of"] = d), l !== undefined && (I.tags = l), g !== undefined && (I["tags.all_of"] = g), y !== undefined && (I["tags.any_of"] = y), p !== undefined && (I.author = p), f !== undefined && (I["author.any_of"] = f), m !== undefined && (I["author.gt"] = m), u !== undefined && (I["author.gte"] = u), b !== undefined && (I["author.lt"] = b), h !== undefined && (I["author.lte"] = h), x !== undefined && (I.stocks = x), R !== undefined && (I["stocks.all_of"] = R), c !== undefined && (I["stocks.any_of"] = c), k !== undefined && (I.tickers = k), A !== undefined && (I["tickers.all_of"] = A), G !== undefined && (I["tickers.any_of"] = G), S !== undefined && (I.limit = S), C !== undefined && (I.sort = C), z(N, I);
    let V = T && T.headers ? T.headers : {};
    return K.headers = { ...W, ...V, ...w.headers }, { url: E(N), options: K };
  }, getCryptoAggregates: async (e, t, i, n, s, o, r, d, l = {}) => {
    Y("getCryptoAggregates", "cryptoTicker", e), Y("getCryptoAggregates", "multiplier", t), Y("getCryptoAggregates", "timespan", i), Y("getCryptoAggregates", "from", n), Y("getCryptoAggregates", "to", s);
    let g = "/v2/aggs/ticker/{cryptoTicker}/range/{multiplier}/{timespan}/{from}/{to}".replace("{cryptoTicker}", encodeURIComponent(String(e))).replace("{multiplier}", encodeURIComponent(String(t))).replace("{timespan}", encodeURIComponent(String(i))).replace("{from}", encodeURIComponent(String(n))).replace("{to}", encodeURIComponent(String(s))), y = new URL(g, B), p;
    a && (p = a.baseOptions);
    let f = { method: "GET", ...p, ...l }, m = {}, u = {};
    await U(u, "apiKey", a), o !== undefined && (u.adjusted = o), r !== undefined && (u.sort = r), d !== undefined && (u.limit = d), z(y, u);
    let b = p && p.headers ? p.headers : {};
    return f.headers = { ...m, ...b, ...l.headers }, { url: E(y), options: f };
  }, getCryptoEMA: async (e, t, i, n, s, o, r, d, l, g, y, p, f = {}) => {
    Y("getCryptoEMA", "cryptoTicker", e);
    let m = "/v1/indicators/ema/{cryptoTicker}".replace("{cryptoTicker}", encodeURIComponent(String(e))), u = new URL(m, B), b;
    a && (b = a.baseOptions);
    let h = { method: "GET", ...b, ...f }, x = {}, R = {};
    await U(R, "apiKey", a), t !== undefined && (R.timestamp = t), i !== undefined && (R.timespan = i), n !== undefined && (R.window = n), s !== undefined && (R.series_type = s), o !== undefined && (R.expand_underlying = o), r !== undefined && (R.order = r), d !== undefined && (R.limit = d), l !== undefined && (R["timestamp.gte"] = l), g !== undefined && (R["timestamp.gt"] = g), y !== undefined && (R["timestamp.lte"] = y), p !== undefined && (R["timestamp.lt"] = p), z(u, R);
    let c = b && b.headers ? b.headers : {};
    return h.headers = { ...x, ...c, ...f.headers }, { url: E(u), options: h };
  }, getCryptoMACD: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u = {}) => {
    Y("getCryptoMACD", "cryptoTicker", e);
    let b = "/v1/indicators/macd/{cryptoTicker}".replace("{cryptoTicker}", encodeURIComponent(String(e))), h = new URL(b, B), x;
    a && (x = a.baseOptions);
    let R = { method: "GET", ...x, ...u }, c = {}, k = {};
    await U(k, "apiKey", a), t !== undefined && (k.timestamp = t), i !== undefined && (k.timespan = i), n !== undefined && (k.short_window = n), s !== undefined && (k.long_window = s), o !== undefined && (k.signal_window = o), r !== undefined && (k.series_type = r), d !== undefined && (k.expand_underlying = d), l !== undefined && (k.order = l), g !== undefined && (k.limit = g), y !== undefined && (k["timestamp.gte"] = y), p !== undefined && (k["timestamp.gt"] = p), f !== undefined && (k["timestamp.lte"] = f), m !== undefined && (k["timestamp.lt"] = m), z(h, k);
    let A = x && x.headers ? x.headers : {};
    return R.headers = { ...c, ...A, ...u.headers }, { url: E(h), options: R };
  }, getCryptoOpenClose: async (e, t, i, n, s = {}) => {
    Y("getCryptoOpenClose", "from", e), Y("getCryptoOpenClose", "to", t), Y("getCryptoOpenClose", "date", i);
    let o = "/v1/open-close/crypto/{from}/{to}/{date}".replace("{from}", encodeURIComponent(String(e))).replace("{to}", encodeURIComponent(String(t))).replace("{date}", encodeURIComponent(String(i))), r = new URL(o, B), d;
    a && (d = a.baseOptions);
    let l = { method: "GET", ...d, ...s }, g = {}, y = {};
    await U(y, "apiKey", a), n !== undefined && (y.adjusted = n), z(r, y);
    let p = d && d.headers ? d.headers : {};
    return l.headers = { ...g, ...p, ...s.headers }, { url: E(r), options: l };
  }, getCryptoRSI: async (e, t, i, n, s, o, r, d, l, g, y, p, f = {}) => {
    Y("getCryptoRSI", "cryptoTicker", e);
    let m = "/v1/indicators/rsi/{cryptoTicker}".replace("{cryptoTicker}", encodeURIComponent(String(e))), u = new URL(m, B), b;
    a && (b = a.baseOptions);
    let h = { method: "GET", ...b, ...f }, x = {}, R = {};
    await U(R, "apiKey", a), t !== undefined && (R.timestamp = t), i !== undefined && (R.timespan = i), n !== undefined && (R.window = n), s !== undefined && (R.series_type = s), o !== undefined && (R.expand_underlying = o), r !== undefined && (R.order = r), d !== undefined && (R.limit = d), l !== undefined && (R["timestamp.gte"] = l), g !== undefined && (R["timestamp.gt"] = g), y !== undefined && (R["timestamp.lte"] = y), p !== undefined && (R["timestamp.lt"] = p), z(u, R);
    let c = b && b.headers ? b.headers : {};
    return h.headers = { ...x, ...c, ...f.headers }, { url: E(u), options: h };
  }, getCryptoSMA: async (e, t, i, n, s, o, r, d, l, g, y, p, f = {}) => {
    Y("getCryptoSMA", "cryptoTicker", e);
    let m = "/v1/indicators/sma/{cryptoTicker}".replace("{cryptoTicker}", encodeURIComponent(String(e))), u = new URL(m, B), b;
    a && (b = a.baseOptions);
    let h = { method: "GET", ...b, ...f }, x = {}, R = {};
    await U(R, "apiKey", a), t !== undefined && (R.timestamp = t), i !== undefined && (R.timespan = i), n !== undefined && (R.window = n), s !== undefined && (R.series_type = s), o !== undefined && (R.expand_underlying = o), r !== undefined && (R.order = r), d !== undefined && (R.limit = d), l !== undefined && (R["timestamp.gte"] = l), g !== undefined && (R["timestamp.gt"] = g), y !== undefined && (R["timestamp.lte"] = y), p !== undefined && (R["timestamp.lt"] = p), z(u, R);
    let c = b && b.headers ? b.headers : {};
    return h.headers = { ...x, ...c, ...f.headers }, { url: E(u), options: h };
  }, getCryptoSnapshotDirection: async (e, t = {}) => {
    Y("getCryptoSnapshotDirection", "direction", e);
    let i = "/v2/snapshot/locale/global/markets/crypto/{direction}".replace("{direction}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getCryptoSnapshotTicker: async (e, t = {}) => {
    Y("getCryptoSnapshotTicker", "ticker", e);
    let i = "/v2/snapshot/locale/global/markets/crypto/tickers/{ticker}".replace("{ticker}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getCryptoSnapshotTickers: async (e, t = {}) => {
    let i = "/v2/snapshot/locale/global/markets/crypto/tickers", n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), e && (d.tickers = e), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getCryptoTrades: async (e, t, i, n, s, o, r, d, l, g = {}) => {
    Y("getCryptoTrades", "cryptoTicker", e);
    let y = "/v3/trades/{cryptoTicker}".replace("{cryptoTicker}", encodeURIComponent(String(e))), p = new URL(y, B), f;
    a && (f = a.baseOptions);
    let m = { method: "GET", ...f, ...g }, u = {}, b = {};
    await U(b, "apiKey", a), t !== undefined && (b.timestamp = t), i !== undefined && (b["timestamp.gte"] = i), n !== undefined && (b["timestamp.gt"] = n), s !== undefined && (b["timestamp.lte"] = s), o !== undefined && (b["timestamp.lt"] = o), r !== undefined && (b.order = r), d !== undefined && (b.limit = d), l !== undefined && (b.sort = l), z(p, b);
    let h = f && f.headers ? f.headers : {};
    return m.headers = { ...u, ...h, ...g.headers }, { url: E(p), options: m };
  }, getCryptoV1Exchanges: async (e, t = {}) => {
    let i = "/crypto/v1/exchanges", n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), e !== undefined && (d.limit = e), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getCurrencyConversion: async (e, t, i, n, s = {}) => {
    Y("getCurrencyConversion", "from", e), Y("getCurrencyConversion", "to", t);
    let o = "/v1/conversion/{from}/{to}".replace("{from}", encodeURIComponent(String(e))).replace("{to}", encodeURIComponent(String(t))), r = new URL(o, B), d;
    a && (d = a.baseOptions);
    let l = { method: "GET", ...d, ...s }, g = {}, y = {};
    await U(y, "apiKey", a), i !== undefined && (y.amount = i), n !== undefined && (y.precision = n), z(r, y);
    let p = d && d.headers ? d.headers : {};
    return l.headers = { ...g, ...p, ...s.headers }, { url: E(r), options: l };
  }, getEtfGlobalV1Analytics: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _, me, he, xe, Re, P, Ae, ne, Ge, Oe, Ce, Ve, Se, we, ve = {}) => {
    let Te = "/etf-global/v1/analytics", Ie = new URL(Te, B), ke;
    a && (ke = a.baseOptions);
    let Le = { method: "GET", ...ke, ...ve }, De = {}, q = {};
    await U(q, "apiKey", a), e !== undefined && (q.composite_ticker = e), t !== undefined && (q["composite_ticker.any_of"] = t), i !== undefined && (q["composite_ticker.gt"] = i), n !== undefined && (q["composite_ticker.gte"] = n), s !== undefined && (q["composite_ticker.lt"] = s), o !== undefined && (q["composite_ticker.lte"] = o), r !== undefined && (q.processed_date = r), d !== undefined && (q["processed_date.gt"] = d), l !== undefined && (q["processed_date.gte"] = l), g !== undefined && (q["processed_date.lt"] = g), y !== undefined && (q["processed_date.lte"] = y), p !== undefined && (q.effective_date = p), f !== undefined && (q["effective_date.gt"] = f), m !== undefined && (q["effective_date.gte"] = m), u !== undefined && (q["effective_date.lt"] = u), b !== undefined && (q["effective_date.lte"] = b), h !== undefined && (q.risk_total_score = h), x !== undefined && (q["risk_total_score.gt"] = x), R !== undefined && (q["risk_total_score.gte"] = R), c !== undefined && (q["risk_total_score.lt"] = c), k !== undefined && (q["risk_total_score.lte"] = k), A !== undefined && (q.reward_score = A), G !== undefined && (q["reward_score.gt"] = G), S !== undefined && (q["reward_score.gte"] = S), C !== undefined && (q["reward_score.lt"] = C), w !== undefined && (q["reward_score.lte"] = w), O !== undefined && (q.quant_total_score = O), N !== undefined && (q["quant_total_score.gt"] = N), T !== undefined && (q["quant_total_score.gte"] = T), K !== undefined && (q["quant_total_score.lt"] = K), W !== undefined && (q["quant_total_score.lte"] = W), I !== undefined && (q.quant_grade = I), V !== undefined && (q["quant_grade.any_of"] = V), v !== undefined && (q["quant_grade.gt"] = v), te !== undefined && (q["quant_grade.gte"] = te), ee !== undefined && (q["quant_grade.lt"] = ee), se !== undefined && (q["quant_grade.lte"] = se), ie !== undefined && (q.quant_composite_technical = ie), $ !== undefined && (q["quant_composite_technical.gt"] = $), oe !== undefined && (q["quant_composite_technical.gte"] = oe), re !== undefined && (q["quant_composite_technical.lt"] = re), L !== undefined && (q["quant_composite_technical.lte"] = L), ae !== undefined && (q.quant_composite_sentiment = ae), ce !== undefined && (q["quant_composite_sentiment.gt"] = ce), pe !== undefined && (q["quant_composite_sentiment.gte"] = pe), fe !== undefined && (q["quant_composite_sentiment.lt"] = fe), de !== undefined && (q["quant_composite_sentiment.lte"] = de), le !== undefined && (q.quant_composite_behavioral = le), ue !== undefined && (q["quant_composite_behavioral.gt"] = ue), X !== undefined && (q["quant_composite_behavioral.gte"] = X), J !== undefined && (q["quant_composite_behavioral.lt"] = J), ye !== undefined && (q["quant_composite_behavioral.lte"] = ye), ge !== undefined && (q.quant_composite_fundamental = ge), be !== undefined && (q["quant_composite_fundamental.gt"] = be), Z !== undefined && (q["quant_composite_fundamental.gte"] = Z), _ !== undefined && (q["quant_composite_fundamental.lt"] = _), me !== undefined && (q["quant_composite_fundamental.lte"] = me), he !== undefined && (q.quant_composite_global = he), xe !== undefined && (q["quant_composite_global.gt"] = xe), Re !== undefined && (q["quant_composite_global.gte"] = Re), P !== undefined && (q["quant_composite_global.lt"] = P), Ae !== undefined && (q["quant_composite_global.lte"] = Ae), ne !== undefined && (q.quant_composite_quality = ne), Ge !== undefined && (q["quant_composite_quality.gt"] = Ge), Oe !== undefined && (q["quant_composite_quality.gte"] = Oe), Ce !== undefined && (q["quant_composite_quality.lt"] = Ce), Ve !== undefined && (q["quant_composite_quality.lte"] = Ve), Se !== undefined && (q.limit = Se), we !== undefined && (q.sort = we), z(Ie, q);
    let Be = ke && ke.headers ? ke.headers : {};
    return Le.headers = { ...De, ...Be, ...ve.headers }, { url: E(Ie), options: Le };
  }, getEtfGlobalV1Constituents: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue = {}) => {
    let X = "/etf-global/v1/constituents", J = new URL(X, B), ye;
    a && (ye = a.baseOptions);
    let ge = { method: "GET", ...ye, ...ue }, be = {}, Z = {};
    await U(Z, "apiKey", a), e !== undefined && (Z.composite_ticker = e), t !== undefined && (Z["composite_ticker.any_of"] = t), i !== undefined && (Z["composite_ticker.gt"] = i), n !== undefined && (Z["composite_ticker.gte"] = n), s !== undefined && (Z["composite_ticker.lt"] = s), o !== undefined && (Z["composite_ticker.lte"] = o), r !== undefined && (Z.constituent_ticker = r), d !== undefined && (Z["constituent_ticker.any_of"] = d), l !== undefined && (Z["constituent_ticker.gt"] = l), g !== undefined && (Z["constituent_ticker.gte"] = g), y !== undefined && (Z["constituent_ticker.lt"] = y), p !== undefined && (Z["constituent_ticker.lte"] = p), f !== undefined && (Z.effective_date = f), m !== undefined && (Z["effective_date.gt"] = m), u !== undefined && (Z["effective_date.gte"] = u), b !== undefined && (Z["effective_date.lt"] = b), h !== undefined && (Z["effective_date.lte"] = h), x !== undefined && (Z.processed_date = x), R !== undefined && (Z["processed_date.gt"] = R), c !== undefined && (Z["processed_date.gte"] = c), k !== undefined && (Z["processed_date.lt"] = k), A !== undefined && (Z["processed_date.lte"] = A), G !== undefined && (Z.us_code = G), S !== undefined && (Z["us_code.any_of"] = S), C !== undefined && (Z["us_code.gt"] = C), w !== undefined && (Z["us_code.gte"] = w), O !== undefined && (Z["us_code.lt"] = O), N !== undefined && (Z["us_code.lte"] = N), T !== undefined && (Z.isin = T), K !== undefined && (Z["isin.any_of"] = K), W !== undefined && (Z["isin.gt"] = W), I !== undefined && (Z["isin.gte"] = I), V !== undefined && (Z["isin.lt"] = V), v !== undefined && (Z["isin.lte"] = v), te !== undefined && (Z.figi = te), ee !== undefined && (Z["figi.any_of"] = ee), se !== undefined && (Z["figi.gt"] = se), ie !== undefined && (Z["figi.gte"] = ie), $ !== undefined && (Z["figi.lt"] = $), oe !== undefined && (Z["figi.lte"] = oe), re !== undefined && (Z.sedol = re), L !== undefined && (Z["sedol.any_of"] = L), ae !== undefined && (Z["sedol.gt"] = ae), ce !== undefined && (Z["sedol.gte"] = ce), pe !== undefined && (Z["sedol.lt"] = pe), fe !== undefined && (Z["sedol.lte"] = fe), de !== undefined && (Z.limit = de), le !== undefined && (Z.sort = le), z(J, Z);
    let _ = ye && ye.headers ? ye.headers : {};
    return ge.headers = { ...be, ..._, ...ue.headers }, { url: E(J), options: ge };
  }, getEtfGlobalV1FundFlows: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R = {}) => {
    let c = "/etf-global/v1/fund-flows", k = new URL(c, B), A;
    a && (A = a.baseOptions);
    let G = { method: "GET", ...A, ...R }, S = {}, C = {};
    await U(C, "apiKey", a), e !== undefined && (C.processed_date = e), t !== undefined && (C["processed_date.gt"] = t), i !== undefined && (C["processed_date.gte"] = i), n !== undefined && (C["processed_date.lt"] = n), s !== undefined && (C["processed_date.lte"] = s), o !== undefined && (C.effective_date = o), r !== undefined && (C["effective_date.gt"] = r), d !== undefined && (C["effective_date.gte"] = d), l !== undefined && (C["effective_date.lt"] = l), g !== undefined && (C["effective_date.lte"] = g), y !== undefined && (C.composite_ticker = y), p !== undefined && (C["composite_ticker.any_of"] = p), f !== undefined && (C["composite_ticker.gt"] = f), m !== undefined && (C["composite_ticker.gte"] = m), u !== undefined && (C["composite_ticker.lt"] = u), b !== undefined && (C["composite_ticker.lte"] = b), h !== undefined && (C.limit = h), x !== undefined && (C.sort = x), z(k, C);
    let w = A && A.headers ? A.headers : {};
    return G.headers = { ...S, ...w, ...R.headers }, { url: E(k), options: G };
  }, getEtfGlobalV1Profiles: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R = {}) => {
    let c = "/etf-global/v1/profiles", k = new URL(c, B), A;
    a && (A = a.baseOptions);
    let G = { method: "GET", ...A, ...R }, S = {}, C = {};
    await U(C, "apiKey", a), e !== undefined && (C.processed_date = e), t !== undefined && (C["processed_date.gt"] = t), i !== undefined && (C["processed_date.gte"] = i), n !== undefined && (C["processed_date.lt"] = n), s !== undefined && (C["processed_date.lte"] = s), o !== undefined && (C.effective_date = o), r !== undefined && (C["effective_date.gt"] = r), d !== undefined && (C["effective_date.gte"] = d), l !== undefined && (C["effective_date.lt"] = l), g !== undefined && (C["effective_date.lte"] = g), y !== undefined && (C.composite_ticker = y), p !== undefined && (C["composite_ticker.any_of"] = p), f !== undefined && (C["composite_ticker.gt"] = f), m !== undefined && (C["composite_ticker.gte"] = m), u !== undefined && (C["composite_ticker.lt"] = u), b !== undefined && (C["composite_ticker.lte"] = b), h !== undefined && (C.limit = h), x !== undefined && (C.sort = x), z(k, C);
    let w = A && A.headers ? A.headers : {};
    return G.headers = { ...S, ...w, ...R.headers }, { url: E(k), options: G };
  }, getEtfGlobalV1Taxonomies: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R = {}) => {
    let c = "/etf-global/v1/taxonomies", k = new URL(c, B), A;
    a && (A = a.baseOptions);
    let G = { method: "GET", ...A, ...R }, S = {}, C = {};
    await U(C, "apiKey", a), e !== undefined && (C.processed_date = e), t !== undefined && (C["processed_date.gt"] = t), i !== undefined && (C["processed_date.gte"] = i), n !== undefined && (C["processed_date.lt"] = n), s !== undefined && (C["processed_date.lte"] = s), o !== undefined && (C.effective_date = o), r !== undefined && (C["effective_date.gt"] = r), d !== undefined && (C["effective_date.gte"] = d), l !== undefined && (C["effective_date.lt"] = l), g !== undefined && (C["effective_date.lte"] = g), y !== undefined && (C.composite_ticker = y), p !== undefined && (C["composite_ticker.any_of"] = p), f !== undefined && (C["composite_ticker.gt"] = f), m !== undefined && (C["composite_ticker.gte"] = m), u !== undefined && (C["composite_ticker.lt"] = u), b !== undefined && (C["composite_ticker.lte"] = b), h !== undefined && (C.limit = h), x !== undefined && (C.sort = x), z(k, C);
    let w = A && A.headers ? A.headers : {};
    return G.headers = { ...S, ...w, ...R.headers }, { url: E(k), options: G };
  }, getEvents: async (e, t, i = {}) => {
    Y("getEvents", "id", e);
    let n = "/vX/reference/tickers/{id}/events".replace("{id}", encodeURIComponent(String(e))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), t !== undefined && (l.types = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getFedV1Inflation: async (e, t, i, n, s, o, r, d, l = {}) => {
    let g = "/fed/v1/inflation", y = new URL(g, B), p;
    a && (p = a.baseOptions);
    let f = { method: "GET", ...p, ...l }, m = {}, u = {};
    await U(u, "apiKey", a), e !== undefined && (u.date = e), t !== undefined && (u["date.any_of"] = t), i !== undefined && (u["date.gt"] = i), n !== undefined && (u["date.gte"] = n), s !== undefined && (u["date.lt"] = s), o !== undefined && (u["date.lte"] = o), r !== undefined && (u.limit = r), d !== undefined && (u.sort = d), z(y, u);
    let b = p && p.headers ? p.headers : {};
    return f.headers = { ...m, ...b, ...l.headers }, { url: E(y), options: f };
  }, getFedV1InflationExpectations: async (e, t, i, n, s, o, r, d, l = {}) => {
    let g = "/fed/v1/inflation-expectations", y = new URL(g, B), p;
    a && (p = a.baseOptions);
    let f = { method: "GET", ...p, ...l }, m = {}, u = {};
    await U(u, "apiKey", a), e !== undefined && (u.date = e), t !== undefined && (u["date.any_of"] = t), i !== undefined && (u["date.gt"] = i), n !== undefined && (u["date.gte"] = n), s !== undefined && (u["date.lt"] = s), o !== undefined && (u["date.lte"] = o), r !== undefined && (u.limit = r), d !== undefined && (u.sort = d), z(y, u);
    let b = p && p.headers ? p.headers : {};
    return f.headers = { ...m, ...b, ...l.headers }, { url: E(y), options: f };
  }, getFedV1LaborMarket: async (e, t, i, n, s, o, r, d, l = {}) => {
    let g = "/fed/v1/labor-market", y = new URL(g, B), p;
    a && (p = a.baseOptions);
    let f = { method: "GET", ...p, ...l }, m = {}, u = {};
    await U(u, "apiKey", a), e !== undefined && (u.date = e), t !== undefined && (u["date.any_of"] = t), i !== undefined && (u["date.gt"] = i), n !== undefined && (u["date.gte"] = n), s !== undefined && (u["date.lt"] = s), o !== undefined && (u["date.lte"] = o), r !== undefined && (u.limit = r), d !== undefined && (u.sort = d), z(y, u);
    let b = p && p.headers ? p.headers : {};
    return f.headers = { ...m, ...b, ...l.headers }, { url: E(y), options: f };
  }, getFedV1TreasuryYields: async (e, t, i, n, s, o, r, d, l = {}) => {
    let g = "/fed/v1/treasury-yields", y = new URL(g, B), p;
    a && (p = a.baseOptions);
    let f = { method: "GET", ...p, ...l }, m = {}, u = {};
    await U(u, "apiKey", a), e !== undefined && (u.date = e), t !== undefined && (u["date.any_of"] = t), i !== undefined && (u["date.gt"] = i), n !== undefined && (u["date.gte"] = n), s !== undefined && (u["date.lt"] = s), o !== undefined && (u["date.lte"] = o), r !== undefined && (u.limit = r), d !== undefined && (u.sort = d), z(y, u);
    let b = p && p.headers ? p.headers : {};
    return f.headers = { ...m, ...b, ...l.headers }, { url: E(y), options: f };
  }, getForexAggregates: async (e, t, i, n, s, o, r, d, l = {}) => {
    Y("getForexAggregates", "forexTicker", e), Y("getForexAggregates", "multiplier", t), Y("getForexAggregates", "timespan", i), Y("getForexAggregates", "from", n), Y("getForexAggregates", "to", s);
    let g = "/v2/aggs/ticker/{forexTicker}/range/{multiplier}/{timespan}/{from}/{to}".replace("{forexTicker}", encodeURIComponent(String(e))).replace("{multiplier}", encodeURIComponent(String(t))).replace("{timespan}", encodeURIComponent(String(i))).replace("{from}", encodeURIComponent(String(n))).replace("{to}", encodeURIComponent(String(s))), y = new URL(g, B), p;
    a && (p = a.baseOptions);
    let f = { method: "GET", ...p, ...l }, m = {}, u = {};
    await U(u, "apiKey", a), o !== undefined && (u.adjusted = o), r !== undefined && (u.sort = r), d !== undefined && (u.limit = d), z(y, u);
    let b = p && p.headers ? p.headers : {};
    return f.headers = { ...m, ...b, ...l.headers }, { url: E(y), options: f };
  }, getForexEMA: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getForexEMA", "fxTicker", e);
    let u = "/v1/indicators/ema/{fxTicker}".replace("{fxTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getForexMACD: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b = {}) => {
    Y("getForexMACD", "fxTicker", e);
    let h = "/v1/indicators/macd/{fxTicker}".replace("{fxTicker}", encodeURIComponent(String(e))), x = new URL(h, B), R;
    a && (R = a.baseOptions);
    let c = { method: "GET", ...R, ...b }, k = {}, A = {};
    await U(A, "apiKey", a), t !== undefined && (A.timestamp = t), i !== undefined && (A.timespan = i), n !== undefined && (A.adjusted = n), s !== undefined && (A.short_window = s), o !== undefined && (A.long_window = o), r !== undefined && (A.signal_window = r), d !== undefined && (A.series_type = d), l !== undefined && (A.expand_underlying = l), g !== undefined && (A.order = g), y !== undefined && (A.limit = y), p !== undefined && (A["timestamp.gte"] = p), f !== undefined && (A["timestamp.gt"] = f), m !== undefined && (A["timestamp.lte"] = m), u !== undefined && (A["timestamp.lt"] = u), z(x, A);
    let G = R && R.headers ? R.headers : {};
    return c.headers = { ...k, ...G, ...b.headers }, { url: E(x), options: c };
  }, getForexQuotes: async (e, t, i, n, s, o, r, d, l, g = {}) => {
    Y("getForexQuotes", "fxTicker", e);
    let y = "/v3/quotes/{fxTicker}".replace("{fxTicker}", encodeURIComponent(String(e))), p = new URL(y, B), f;
    a && (f = a.baseOptions);
    let m = { method: "GET", ...f, ...g }, u = {}, b = {};
    await U(b, "apiKey", a), t !== undefined && (b.timestamp = t), i !== undefined && (b["timestamp.gte"] = i), n !== undefined && (b["timestamp.gt"] = n), s !== undefined && (b["timestamp.lte"] = s), o !== undefined && (b["timestamp.lt"] = o), r !== undefined && (b.order = r), d !== undefined && (b.limit = d), l !== undefined && (b.sort = l), z(p, b);
    let h = f && f.headers ? f.headers : {};
    return m.headers = { ...u, ...h, ...g.headers }, { url: E(p), options: m };
  }, getForexRSI: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getForexRSI", "fxTicker", e);
    let u = "/v1/indicators/rsi/{fxTicker}".replace("{fxTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getForexSMA: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getForexSMA", "fxTicker", e);
    let u = "/v1/indicators/sma/{fxTicker}".replace("{fxTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getForexSnapshotDirection: async (e, t = {}) => {
    Y("getForexSnapshotDirection", "direction", e);
    let i = "/v2/snapshot/locale/global/markets/forex/{direction}".replace("{direction}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getForexSnapshotTicker: async (e, t = {}) => {
    Y("getForexSnapshotTicker", "ticker", e);
    let i = "/v2/snapshot/locale/global/markets/forex/tickers/{ticker}".replace("{ticker}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getForexSnapshotTickers: async (e, t = {}) => {
    let i = "/v2/snapshot/locale/global/markets/forex/tickers", n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), e && (d.tickers = e), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getForexV1Exchanges: async (e, t = {}) => {
    let i = "/forex/v1/exchanges", n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), e !== undefined && (d.limit = e), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getFuturesAggregates: async (e, t, i, n, s, o, r, d, l, g = {}) => {
    Y("getFuturesAggregates", "ticker", e);
    let y = "/futures/vX/aggs/{ticker}".replace("{ticker}", encodeURIComponent(String(e))), p = new URL(y, B), f;
    a && (f = a.baseOptions);
    let m = { method: "GET", ...f, ...g }, u = {}, b = {};
    await U(b, "apiKey", a), t !== undefined && (b.resolution = t), i !== undefined && (b.window_start = i), n !== undefined && (b.limit = n), s !== undefined && (b["window_start.gte"] = s), o !== undefined && (b["window_start.gt"] = o), r !== undefined && (b["window_start.lte"] = r), d !== undefined && (b["window_start.lt"] = d), l !== undefined && (b.sort = l), z(p, b);
    let h = f && f.headers ? f.headers : {};
    return m.headers = { ...u, ...h, ...g.headers }, { url: E(p), options: m };
  }, getFuturesQuotes: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getFuturesQuotes", "ticker", e);
    let u = "/futures/vX/quotes/{ticker}".replace("{ticker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.session_end_date = i), n !== undefined && (c.limit = n), s !== undefined && (c["timestamp.gte"] = s), o !== undefined && (c["timestamp.gt"] = o), r !== undefined && (c["timestamp.lte"] = r), d !== undefined && (c["timestamp.lt"] = d), l !== undefined && (c["session_end_date.gte"] = l), g !== undefined && (c["session_end_date.gt"] = g), y !== undefined && (c["session_end_date.lte"] = y), p !== undefined && (c["session_end_date.lt"] = p), f !== undefined && (c.sort = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getFuturesTrades: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getFuturesTrades", "ticker", e);
    let u = "/futures/vX/trades/{ticker}".replace("{ticker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.session_end_date = i), n !== undefined && (c.limit = n), s !== undefined && (c["timestamp.gte"] = s), o !== undefined && (c["timestamp.gt"] = o), r !== undefined && (c["timestamp.lte"] = r), d !== undefined && (c["timestamp.lt"] = d), l !== undefined && (c["session_end_date.gte"] = l), g !== undefined && (c["session_end_date.gt"] = g), y !== undefined && (c["session_end_date.lte"] = y), p !== undefined && (c["session_end_date.lt"] = p), f !== undefined && (c.sort = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getFuturesVXContracts: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V = {}) => {
    let v = "/futures/vX/contracts", te = new URL(v, B), ee;
    a && (ee = a.baseOptions);
    let se = { method: "GET", ...ee, ...V }, ie = {}, $ = {};
    await U($, "apiKey", a), e !== undefined && ($.date = e), t !== undefined && ($["date.gt"] = t), i !== undefined && ($["date.gte"] = i), n !== undefined && ($["date.lt"] = n), s !== undefined && ($["date.lte"] = s), o !== undefined && ($.product_code = o), r !== undefined && ($["product_code.any_of"] = r), d !== undefined && ($["product_code.gt"] = d), l !== undefined && ($["product_code.gte"] = l), g !== undefined && ($["product_code.lt"] = g), y !== undefined && ($["product_code.lte"] = y), p !== undefined && ($.ticker = p), f !== undefined && ($["ticker.any_of"] = f), m !== undefined && ($["ticker.gt"] = m), u !== undefined && ($["ticker.gte"] = u), b !== undefined && ($["ticker.lt"] = b), h !== undefined && ($["ticker.lte"] = h), x !== undefined && ($.active = x), R !== undefined && ($.type = R), c !== undefined && ($["type.any_of"] = c), k !== undefined && ($.first_trade_date = k), A !== undefined && ($["first_trade_date.gt"] = A), G !== undefined && ($["first_trade_date.gte"] = G), S !== undefined && ($["first_trade_date.lt"] = S), C !== undefined && ($["first_trade_date.lte"] = C), w !== undefined && ($.last_trade_date = w), O !== undefined && ($["last_trade_date.gt"] = O), N !== undefined && ($["last_trade_date.gte"] = N), T !== undefined && ($["last_trade_date.lt"] = T), K !== undefined && ($["last_trade_date.lte"] = K), W !== undefined && ($.limit = W), I !== undefined && ($.sort = I), z(te, $);
    let oe = ee && ee.headers ? ee.headers : {};
    return se.headers = { ...ie, ...oe, ...V.headers }, { url: E(te), options: se };
  }, getFuturesVXExchanges: async (e, t = {}) => {
    let i = "/futures/vX/exchanges", n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), e !== undefined && (d.limit = e), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getFuturesVXMarketStatus: async (e, t, i, n, s, o, r, d = {}) => {
    let l = "/futures/vX/market-status", g = new URL(l, B), y;
    a && (y = a.baseOptions);
    let p = { method: "GET", ...y, ...d }, f = {}, m = {};
    await U(m, "apiKey", a), e !== undefined && (m.product_code = e), t !== undefined && (m["product_code.any_of"] = t), i !== undefined && (m["product_code.gt"] = i), n !== undefined && (m["product_code.gte"] = n), s !== undefined && (m["product_code.lt"] = s), o !== undefined && (m["product_code.lte"] = o), r !== undefined && (m.limit = r), z(g, m);
    let u = y && y.headers ? y.headers : {};
    return p.headers = { ...f, ...u, ...d.headers }, { url: E(g), options: p };
  }, getFuturesVXProducts: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee = {}) => {
    let se = "/futures/vX/products", ie = new URL(se, B), $;
    a && ($ = a.baseOptions);
    let oe = { method: "GET", ...$, ...ee }, re = {}, L = {};
    await U(L, "apiKey", a), e !== undefined && (L.name = e), t !== undefined && (L["name.any_of"] = t), i !== undefined && (L["name.gt"] = i), n !== undefined && (L["name.gte"] = n), s !== undefined && (L["name.lt"] = s), o !== undefined && (L["name.lte"] = o), r !== undefined && (L.product_code = r), d !== undefined && (L["product_code.any_of"] = d), l !== undefined && (L["product_code.gt"] = l), g !== undefined && (L["product_code.gte"] = g), y !== undefined && (L["product_code.lt"] = y), p !== undefined && (L["product_code.lte"] = p), f !== undefined && (L.date = f), m !== undefined && (L["date.gt"] = m), u !== undefined && (L["date.gte"] = u), b !== undefined && (L["date.lt"] = b), h !== undefined && (L["date.lte"] = h), x !== undefined && (L.trading_venue = x), R !== undefined && (L["trading_venue.any_of"] = R), c !== undefined && (L["trading_venue.gt"] = c), k !== undefined && (L["trading_venue.gte"] = k), A !== undefined && (L["trading_venue.lt"] = A), G !== undefined && (L["trading_venue.lte"] = G), S !== undefined && (L.sector = S), C !== undefined && (L["sector.any_of"] = C), w !== undefined && (L.sub_sector = w), O !== undefined && (L["sub_sector.any_of"] = O), N !== undefined && (L.asset_class = N), T !== undefined && (L["asset_class.any_of"] = T), K !== undefined && (L.asset_sub_class = K), W !== undefined && (L["asset_sub_class.any_of"] = W), I !== undefined && (L.type = I), V !== undefined && (L["type.any_of"] = V), v !== undefined && (L.limit = v), te !== undefined && (L.sort = te), z(ie, L);
    let ae = $ && $.headers ? $.headers : {};
    return oe.headers = { ...re, ...ae, ...ee.headers }, { url: E(ie), options: oe };
  }, getFuturesVXSchedules: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k = {}) => {
    let A = "/futures/vX/schedules", G = new URL(A, B), S;
    a && (S = a.baseOptions);
    let C = { method: "GET", ...S, ...k }, w = {}, O = {};
    await U(O, "apiKey", a), e !== undefined && (O.product_code = e), t !== undefined && (O["product_code.any_of"] = t), i !== undefined && (O["product_code.gt"] = i), n !== undefined && (O["product_code.gte"] = n), s !== undefined && (O["product_code.lt"] = s), o !== undefined && (O["product_code.lte"] = o), r !== undefined && (O.session_end_date = r), d !== undefined && (O["session_end_date.any_of"] = d), l !== undefined && (O["session_end_date.gt"] = l), g !== undefined && (O["session_end_date.gte"] = g), y !== undefined && (O["session_end_date.lt"] = y), p !== undefined && (O["session_end_date.lte"] = p), f !== undefined && (O.trading_venue = f), m !== undefined && (O["trading_venue.any_of"] = m), u !== undefined && (O["trading_venue.gt"] = u), b !== undefined && (O["trading_venue.gte"] = b), h !== undefined && (O["trading_venue.lt"] = h), x !== undefined && (O["trading_venue.lte"] = x), R !== undefined && (O.limit = R), c !== undefined && (O.sort = c), z(G, O);
    let N = S && S.headers ? S.headers : {};
    return C.headers = { ...w, ...N, ...k.headers }, { url: E(G), options: C };
  }, getFuturesVXSnapshot: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u = {}) => {
    let b = "/futures/vX/snapshot", h = new URL(b, B), x;
    a && (x = a.baseOptions);
    let R = { method: "GET", ...x, ...u }, c = {}, k = {};
    await U(k, "apiKey", a), e !== undefined && (k.product_code = e), t !== undefined && (k["product_code.any_of"] = t), i !== undefined && (k["product_code.gt"] = i), n !== undefined && (k["product_code.gte"] = n), s !== undefined && (k["product_code.lt"] = s), o !== undefined && (k["product_code.lte"] = o), r !== undefined && (k.ticker = r), d !== undefined && (k["ticker.any_of"] = d), l !== undefined && (k["ticker.gt"] = l), g !== undefined && (k["ticker.gte"] = g), y !== undefined && (k["ticker.lt"] = y), p !== undefined && (k["ticker.lte"] = p), f !== undefined && (k.limit = f), m !== undefined && (k.sort = m), z(h, k);
    let A = x && x.headers ? x.headers : {};
    return R.headers = { ...c, ...A, ...u.headers }, { url: E(h), options: R };
  }, getGroupedCryptoAggregates: async (e, t, i = {}) => {
    Y("getGroupedCryptoAggregates", "date", e);
    let n = "/v2/aggs/grouped/locale/global/market/crypto/{date}".replace("{date}", encodeURIComponent(String(e))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), t !== undefined && (l.adjusted = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getGroupedForexAggregates: async (e, t, i = {}) => {
    Y("getGroupedForexAggregates", "date", e);
    let n = "/v2/aggs/grouped/locale/global/market/fx/{date}".replace("{date}", encodeURIComponent(String(e))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), t !== undefined && (l.adjusted = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getGroupedStocksAggregates: async (e, t, i, n = {}) => {
    Y("getGroupedStocksAggregates", "date", e);
    let s = "/v2/aggs/grouped/locale/us/market/stocks/{date}".replace("{date}", encodeURIComponent(String(e))), o = new URL(s, B), r;
    a && (r = a.baseOptions);
    let d = { method: "GET", ...r, ...n }, l = {}, g = {};
    await U(g, "apiKey", a), t !== undefined && (g.adjusted = t), i !== undefined && (g.include_otc = i), z(o, g);
    let y = r && r.headers ? r.headers : {};
    return d.headers = { ...l, ...y, ...n.headers }, { url: E(o), options: d };
  }, getIndicesAggregates: async (e, t, i, n, s, o, r, d = {}) => {
    Y("getIndicesAggregates", "indicesTicker", e), Y("getIndicesAggregates", "multiplier", t), Y("getIndicesAggregates", "timespan", i), Y("getIndicesAggregates", "from", n), Y("getIndicesAggregates", "to", s);
    let l = "/v2/aggs/ticker/{indicesTicker}/range/{multiplier}/{timespan}/{from}/{to}".replace("{indicesTicker}", encodeURIComponent(String(e))).replace("{multiplier}", encodeURIComponent(String(t))).replace("{timespan}", encodeURIComponent(String(i))).replace("{from}", encodeURIComponent(String(n))).replace("{to}", encodeURIComponent(String(s))), g = new URL(l, B), y;
    a && (y = a.baseOptions);
    let p = { method: "GET", ...y, ...d }, f = {}, m = {};
    await U(m, "apiKey", a), o !== undefined && (m.sort = o), r !== undefined && (m.limit = r), z(g, m);
    let u = y && y.headers ? y.headers : {};
    return p.headers = { ...f, ...u, ...d.headers }, { url: E(g), options: p };
  }, getIndicesEMA: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getIndicesEMA", "indicesTicker", e);
    let u = "/v1/indicators/ema/{indicesTicker}".replace("{indicesTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getIndicesMACD: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b = {}) => {
    Y("getIndicesMACD", "indicesTicker", e);
    let h = "/v1/indicators/macd/{indicesTicker}".replace("{indicesTicker}", encodeURIComponent(String(e))), x = new URL(h, B), R;
    a && (R = a.baseOptions);
    let c = { method: "GET", ...R, ...b }, k = {}, A = {};
    await U(A, "apiKey", a), t !== undefined && (A.timestamp = t), i !== undefined && (A.timespan = i), n !== undefined && (A.adjusted = n), s !== undefined && (A.short_window = s), o !== undefined && (A.long_window = o), r !== undefined && (A.signal_window = r), d !== undefined && (A.series_type = d), l !== undefined && (A.expand_underlying = l), g !== undefined && (A.order = g), y !== undefined && (A.limit = y), p !== undefined && (A["timestamp.gte"] = p), f !== undefined && (A["timestamp.gt"] = f), m !== undefined && (A["timestamp.lte"] = m), u !== undefined && (A["timestamp.lt"] = u), z(x, A);
    let G = R && R.headers ? R.headers : {};
    return c.headers = { ...k, ...G, ...b.headers }, { url: E(x), options: c };
  }, getIndicesOpenClose: async (e, t, i = {}) => {
    Y("getIndicesOpenClose", "indicesTicker", e), Y("getIndicesOpenClose", "date", t);
    let n = "/v1/open-close/{indicesTicker}/{date}".replace("{indicesTicker}", encodeURIComponent(String(e))).replace("{date}", encodeURIComponent(String(t))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getIndicesRSI: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getIndicesRSI", "indicesTicker", e);
    let u = "/v1/indicators/rsi/{indicesTicker}".replace("{indicesTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getIndicesSMA: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getIndicesSMA", "indicesTicker", e);
    let u = "/v1/indicators/sma/{indicesTicker}".replace("{indicesTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getIndicesSnapshot: async (e, t, i, n, s, o, r, d, l, g = {}) => {
    let y = "/v3/snapshot/indices", p = new URL(y, B), f;
    a && (f = a.baseOptions);
    let m = { method: "GET", ...f, ...g }, u = {}, b = {};
    await U(b, "apiKey", a), e !== undefined && (b["ticker.any_of"] = e), t !== undefined && (b.ticker = t), i !== undefined && (b["ticker.gte"] = i), n !== undefined && (b["ticker.gt"] = n), s !== undefined && (b["ticker.lte"] = s), o !== undefined && (b["ticker.lt"] = o), r !== undefined && (b.order = r), d !== undefined && (b.limit = d), l !== undefined && (b.sort = l), z(p, b);
    let h = f && f.headers ? f.headers : {};
    return m.headers = { ...u, ...h, ...g.headers }, { url: E(p), options: m };
  }, getLastCryptoTrade: async (e, t, i = {}) => {
    Y("getLastCryptoTrade", "from", e), Y("getLastCryptoTrade", "to", t);
    let n = "/v1/last/crypto/{from}/{to}".replace("{from}", encodeURIComponent(String(e))).replace("{to}", encodeURIComponent(String(t))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getLastCurrencyQuote: async (e, t, i = {}) => {
    Y("getLastCurrencyQuote", "from", e), Y("getLastCurrencyQuote", "to", t);
    let n = "/v1/last_quote/currencies/{from}/{to}".replace("{from}", encodeURIComponent(String(e))).replace("{to}", encodeURIComponent(String(t))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getLastOptionsTrade: async (e, t = {}) => {
    Y("getLastOptionsTrade", "optionsTicker", e);
    let i = "/v2/last/trade/{optionsTicker}".replace("{optionsTicker}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getLastStocksQuote: async (e, t = {}) => {
    Y("getLastStocksQuote", "stocksTicker", e);
    let i = "/v2/last/nbbo/{stocksTicker}".replace("{stocksTicker}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getLastStocksTrade: async (e, t = {}) => {
    Y("getLastStocksTrade", "stocksTicker", e);
    let i = "/v2/last/trade/{stocksTicker}".replace("{stocksTicker}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getMarketHolidays: async (e = {}) => {
    let t = "/v1/marketstatus/upcoming", i = new URL(t, B), n;
    a && (n = a.baseOptions);
    let s = { method: "GET", ...n, ...e }, o = {}, r = {};
    await U(r, "apiKey", a), z(i, r);
    let d = n && n.headers ? n.headers : {};
    return s.headers = { ...o, ...d, ...e.headers }, { url: E(i), options: s };
  }, getMarketStatus: async (e = {}) => {
    let t = "/v1/marketstatus/now", i = new URL(t, B), n;
    a && (n = a.baseOptions);
    let s = { method: "GET", ...n, ...e }, o = {}, r = {};
    await U(r, "apiKey", a), z(i, r);
    let d = n && n.headers ? n.headers : {};
    return s.headers = { ...o, ...d, ...e.headers }, { url: E(i), options: s };
  }, getOptionContract: async (e, t, i = {}) => {
    Y("getOptionContract", "underlyingAsset", e), Y("getOptionContract", "optionContract", t);
    let n = "/v3/snapshot/options/{underlyingAsset}/{optionContract}".replace("{underlyingAsset}", encodeURIComponent(String(e))).replace("{optionContract}", encodeURIComponent(String(t))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getOptionsAggregates: async (e, t, i, n, s, o, r, d, l = {}) => {
    Y("getOptionsAggregates", "optionsTicker", e), Y("getOptionsAggregates", "multiplier", t), Y("getOptionsAggregates", "timespan", i), Y("getOptionsAggregates", "from", n), Y("getOptionsAggregates", "to", s);
    let g = "/v2/aggs/ticker/{optionsTicker}/range/{multiplier}/{timespan}/{from}/{to}".replace("{optionsTicker}", encodeURIComponent(String(e))).replace("{multiplier}", encodeURIComponent(String(t))).replace("{timespan}", encodeURIComponent(String(i))).replace("{from}", encodeURIComponent(String(n))).replace("{to}", encodeURIComponent(String(s))), y = new URL(g, B), p;
    a && (p = a.baseOptions);
    let f = { method: "GET", ...p, ...l }, m = {}, u = {};
    await U(u, "apiKey", a), o !== undefined && (u.adjusted = o), r !== undefined && (u.sort = r), d !== undefined && (u.limit = d), z(y, u);
    let b = p && p.headers ? p.headers : {};
    return f.headers = { ...m, ...b, ...l.headers }, { url: E(y), options: f };
  }, getOptionsChain: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b = {}) => {
    Y("getOptionsChain", "underlyingAsset", e);
    let h = "/v3/snapshot/options/{underlyingAsset}".replace("{underlyingAsset}", encodeURIComponent(String(e))), x = new URL(h, B), R;
    a && (R = a.baseOptions);
    let c = { method: "GET", ...R, ...b }, k = {}, A = {};
    await U(A, "apiKey", a), t !== undefined && (A.strike_price = t), i !== undefined && (A.expiration_date = i), n !== undefined && (A.contract_type = n), s !== undefined && (A["strike_price.gte"] = s), o !== undefined && (A["strike_price.gt"] = o), r !== undefined && (A["strike_price.lte"] = r), d !== undefined && (A["strike_price.lt"] = d), l !== undefined && (A["expiration_date.gte"] = l), g !== undefined && (A["expiration_date.gt"] = g), y !== undefined && (A["expiration_date.lte"] = y), p !== undefined && (A["expiration_date.lt"] = p), f !== undefined && (A.order = f), m !== undefined && (A.limit = m), u !== undefined && (A.sort = u), z(x, A);
    let G = R && R.headers ? R.headers : {};
    return c.headers = { ...k, ...G, ...b.headers }, { url: E(x), options: c };
  }, getOptionsContract: async (e, t, i = {}) => {
    Y("getOptionsContract", "optionsTicker", e);
    let n = "/v3/reference/options/contracts/{options_ticker}".replace("{options_ticker}", encodeURIComponent(String(e))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), t !== undefined && (l.as_of = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getOptionsEMA: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getOptionsEMA", "optionsTicker", e);
    let u = "/v1/indicators/ema/{optionsTicker}".replace("{optionsTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getOptionsMACD: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b = {}) => {
    Y("getOptionsMACD", "optionsTicker", e);
    let h = "/v1/indicators/macd/{optionsTicker}".replace("{optionsTicker}", encodeURIComponent(String(e))), x = new URL(h, B), R;
    a && (R = a.baseOptions);
    let c = { method: "GET", ...R, ...b }, k = {}, A = {};
    await U(A, "apiKey", a), t !== undefined && (A.timestamp = t), i !== undefined && (A.timespan = i), n !== undefined && (A.adjusted = n), s !== undefined && (A.short_window = s), o !== undefined && (A.long_window = o), r !== undefined && (A.signal_window = r), d !== undefined && (A.series_type = d), l !== undefined && (A.expand_underlying = l), g !== undefined && (A.order = g), y !== undefined && (A.limit = y), p !== undefined && (A["timestamp.gte"] = p), f !== undefined && (A["timestamp.gt"] = f), m !== undefined && (A["timestamp.lte"] = m), u !== undefined && (A["timestamp.lt"] = u), z(x, A);
    let G = R && R.headers ? R.headers : {};
    return c.headers = { ...k, ...G, ...b.headers }, { url: E(x), options: c };
  }, getOptionsOpenClose: async (e, t, i, n = {}) => {
    Y("getOptionsOpenClose", "optionsTicker", e), Y("getOptionsOpenClose", "date", t);
    let s = "/v1/open-close/{optionsTicker}/{date}".replace("{optionsTicker}", encodeURIComponent(String(e))).replace("{date}", encodeURIComponent(String(t))), o = new URL(s, B), r;
    a && (r = a.baseOptions);
    let d = { method: "GET", ...r, ...n }, l = {}, g = {};
    await U(g, "apiKey", a), i !== undefined && (g.adjusted = i), z(o, g);
    let y = r && r.headers ? r.headers : {};
    return d.headers = { ...l, ...y, ...n.headers }, { url: E(o), options: d };
  }, getOptionsQuotes: async (e, t, i, n, s, o, r, d, l, g = {}) => {
    Y("getOptionsQuotes", "optionsTicker", e);
    let y = "/v3/quotes/{optionsTicker}".replace("{optionsTicker}", encodeURIComponent(String(e))), p = new URL(y, B), f;
    a && (f = a.baseOptions);
    let m = { method: "GET", ...f, ...g }, u = {}, b = {};
    await U(b, "apiKey", a), t !== undefined && (b.timestamp = t), i !== undefined && (b["timestamp.gte"] = i), n !== undefined && (b["timestamp.gt"] = n), s !== undefined && (b["timestamp.lte"] = s), o !== undefined && (b["timestamp.lt"] = o), r !== undefined && (b.order = r), d !== undefined && (b.limit = d), l !== undefined && (b.sort = l), z(p, b);
    let h = f && f.headers ? f.headers : {};
    return m.headers = { ...u, ...h, ...g.headers }, { url: E(p), options: m };
  }, getOptionsRSI: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getOptionsRSI", "optionsTicker", e);
    let u = "/v1/indicators/rsi/{optionsTicker}".replace("{optionsTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getOptionsSMA: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getOptionsSMA", "optionsTicker", e);
    let u = "/v1/indicators/sma/{optionsTicker}".replace("{optionsTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getOptionsTrades: async (e, t, i, n, s, o, r, d, l, g = {}) => {
    Y("getOptionsTrades", "optionsTicker", e);
    let y = "/v3/trades/{optionsTicker}".replace("{optionsTicker}", encodeURIComponent(String(e))), p = new URL(y, B), f;
    a && (f = a.baseOptions);
    let m = { method: "GET", ...f, ...g }, u = {}, b = {};
    await U(b, "apiKey", a), t !== undefined && (b.timestamp = t), i !== undefined && (b["timestamp.gte"] = i), n !== undefined && (b["timestamp.gt"] = n), s !== undefined && (b["timestamp.lte"] = s), o !== undefined && (b["timestamp.lt"] = o), r !== undefined && (b.order = r), d !== undefined && (b.limit = d), l !== undefined && (b.sort = l), z(p, b);
    let h = f && f.headers ? f.headers : {};
    return m.headers = { ...u, ...h, ...g.headers }, { url: E(p), options: m };
  }, getOptionsV1Exchanges: async (e, t = {}) => {
    let i = "/options/v1/exchanges", n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), e !== undefined && (d.limit = e), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getPreviousCryptoAggregates: async (e, t, i = {}) => {
    Y("getPreviousCryptoAggregates", "cryptoTicker", e);
    let n = "/v2/aggs/ticker/{cryptoTicker}/prev".replace("{cryptoTicker}", encodeURIComponent(String(e))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), t !== undefined && (l.adjusted = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getPreviousForexAggregates: async (e, t, i = {}) => {
    Y("getPreviousForexAggregates", "forexTicker", e);
    let n = "/v2/aggs/ticker/{forexTicker}/prev".replace("{forexTicker}", encodeURIComponent(String(e))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), t !== undefined && (l.adjusted = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getPreviousIndicesAggregates: async (e, t = {}) => {
    Y("getPreviousIndicesAggregates", "indicesTicker", e);
    let i = "/v2/aggs/ticker/{indicesTicker}/prev".replace("{indicesTicker}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getPreviousOptionsAggregates: async (e, t, i = {}) => {
    Y("getPreviousOptionsAggregates", "optionsTicker", e);
    let n = "/v2/aggs/ticker/{optionsTicker}/prev".replace("{optionsTicker}", encodeURIComponent(String(e))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), t !== undefined && (l.adjusted = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getPreviousStocksAggregates: async (e, t, i = {}) => {
    Y("getPreviousStocksAggregates", "stocksTicker", e);
    let n = "/v2/aggs/ticker/{stocksTicker}/prev".replace("{stocksTicker}", encodeURIComponent(String(e))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), t !== undefined && (l.adjusted = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getRelatedCompanies: async (e, t = {}) => {
    Y("getRelatedCompanies", "ticker", e);
    let i = "/v1/related-companies/{ticker}".replace("{ticker}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getSnapshotSummary: async (e, t = {}) => {
    let i = "/v1/summaries", n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), e !== undefined && (d["ticker.any_of"] = e), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getSnapshots: async (e, t, i, n, s, o, r, d, l, g, y = {}) => {
    let p = "/v3/snapshot", f = new URL(p, B), m;
    a && (m = a.baseOptions);
    let u = { method: "GET", ...m, ...y }, b = {}, h = {};
    await U(h, "apiKey", a), e !== undefined && (h.ticker = e), t !== undefined && (h.type = t), i !== undefined && (h["ticker.gte"] = i), n !== undefined && (h["ticker.gt"] = n), s !== undefined && (h["ticker.lte"] = s), o !== undefined && (h["ticker.lt"] = o), r !== undefined && (h["ticker.any_of"] = r), d !== undefined && (h.order = d), l !== undefined && (h.limit = l), g !== undefined && (h.sort = g), z(f, h);
    let x = m && m.headers ? m.headers : {};
    return u.headers = { ...b, ...x, ...y.headers }, { url: E(f), options: u };
  }, getStocksAggregates: async (e, t, i, n, s, o, r, d, l = {}) => {
    Y("getStocksAggregates", "stocksTicker", e), Y("getStocksAggregates", "multiplier", t), Y("getStocksAggregates", "timespan", i), Y("getStocksAggregates", "from", n), Y("getStocksAggregates", "to", s);
    let g = "/v2/aggs/ticker/{stocksTicker}/range/{multiplier}/{timespan}/{from}/{to}".replace("{stocksTicker}", encodeURIComponent(String(e))).replace("{multiplier}", encodeURIComponent(String(t))).replace("{timespan}", encodeURIComponent(String(i))).replace("{from}", encodeURIComponent(String(n))).replace("{to}", encodeURIComponent(String(s))), y = new URL(g, B), p;
    a && (p = a.baseOptions);
    let f = { method: "GET", ...p, ...l }, m = {}, u = {};
    await U(u, "apiKey", a), o !== undefined && (u.adjusted = o), r !== undefined && (u.sort = r), d !== undefined && (u.limit = d), z(y, u);
    let b = p && p.headers ? p.headers : {};
    return f.headers = { ...m, ...b, ...l.headers }, { url: E(y), options: f };
  }, getStocksEMA: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getStocksEMA", "stockTicker", e);
    let u = "/v1/indicators/ema/{stockTicker}".replace("{stockTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getStocksFilings10KVXSections: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O = {}) => {
    let N = "/stocks/filings/10-K/vX/sections", T = new URL(N, B), K;
    a && (K = a.baseOptions);
    let W = { method: "GET", ...K, ...O }, I = {}, V = {};
    await U(V, "apiKey", a), e !== undefined && (V.cik = e), t !== undefined && (V["cik.any_of"] = t), i !== undefined && (V["cik.gt"] = i), n !== undefined && (V["cik.gte"] = n), s !== undefined && (V["cik.lt"] = s), o !== undefined && (V["cik.lte"] = o), r !== undefined && (V.ticker = r), d !== undefined && (V["ticker.any_of"] = d), l !== undefined && (V["ticker.gt"] = l), g !== undefined && (V["ticker.gte"] = g), y !== undefined && (V["ticker.lt"] = y), p !== undefined && (V["ticker.lte"] = p), f !== undefined && (V.section = f), m !== undefined && (V["section.any_of"] = m), u !== undefined && (V.filing_date = u), b !== undefined && (V["filing_date.gt"] = b), h !== undefined && (V["filing_date.gte"] = h), x !== undefined && (V["filing_date.lt"] = x), R !== undefined && (V["filing_date.lte"] = R), c !== undefined && (V.period_end = c), k !== undefined && (V["period_end.gt"] = k), A !== undefined && (V["period_end.gte"] = A), G !== undefined && (V["period_end.lt"] = G), S !== undefined && (V["period_end.lte"] = S), C !== undefined && (V.limit = C), w !== undefined && (V.sort = w), z(T, V);
    let v = K && K.headers ? K.headers : {};
    return W.headers = { ...I, ...v, ...O.headers }, { url: E(T), options: W };
  }, getStocksFilingsVXRiskFactors: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k = {}) => {
    let A = "/stocks/filings/vX/risk-factors", G = new URL(A, B), S;
    a && (S = a.baseOptions);
    let C = { method: "GET", ...S, ...k }, w = {}, O = {};
    await U(O, "apiKey", a), e !== undefined && (O.filing_date = e), t !== undefined && (O["filing_date.any_of"] = t), i !== undefined && (O["filing_date.gt"] = i), n !== undefined && (O["filing_date.gte"] = n), s !== undefined && (O["filing_date.lt"] = s), o !== undefined && (O["filing_date.lte"] = o), r !== undefined && (O.ticker = r), d !== undefined && (O["ticker.any_of"] = d), l !== undefined && (O["ticker.gt"] = l), g !== undefined && (O["ticker.gte"] = g), y !== undefined && (O["ticker.lt"] = y), p !== undefined && (O["ticker.lte"] = p), f !== undefined && (O.cik = f), m !== undefined && (O["cik.any_of"] = m), u !== undefined && (O["cik.gt"] = u), b !== undefined && (O["cik.gte"] = b), h !== undefined && (O["cik.lt"] = h), x !== undefined && (O["cik.lte"] = x), R !== undefined && (O.limit = R), c !== undefined && (O.sort = c), z(G, O);
    let N = S && S.headers ? S.headers : {};
    return C.headers = { ...w, ...N, ...k.headers }, { url: E(G), options: C };
  }, getStocksFinancialsV1BalanceSheets: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X = {}) => {
    let J = "/stocks/financials/v1/balance-sheets", ye = new URL(J, B), ge;
    a && (ge = a.baseOptions);
    let be = { method: "GET", ...ge, ...X }, Z = {}, _ = {};
    await U(_, "apiKey", a), e !== undefined && (_.cik = e), t !== undefined && (_["cik.any_of"] = t), i !== undefined && (_["cik.gt"] = i), n !== undefined && (_["cik.gte"] = n), s !== undefined && (_["cik.lt"] = s), o !== undefined && (_["cik.lte"] = o), r !== undefined && (_.tickers = r), d !== undefined && (_["tickers.all_of"] = d), l !== undefined && (_["tickers.any_of"] = l), g !== undefined && (_.period_end = g), y !== undefined && (_["period_end.gt"] = y), p !== undefined && (_["period_end.gte"] = p), f !== undefined && (_["period_end.lt"] = f), m !== undefined && (_["period_end.lte"] = m), u !== undefined && (_.filing_date = u), b !== undefined && (_["filing_date.gt"] = b), h !== undefined && (_["filing_date.gte"] = h), x !== undefined && (_["filing_date.lt"] = x), R !== undefined && (_["filing_date.lte"] = R), c !== undefined && (_.fiscal_year = c), k !== undefined && (_["fiscal_year.gt"] = k), A !== undefined && (_["fiscal_year.gte"] = A), G !== undefined && (_["fiscal_year.lt"] = G), S !== undefined && (_["fiscal_year.lte"] = S), C !== undefined && (_.fiscal_quarter = C), w !== undefined && (_["fiscal_quarter.gt"] = w), O !== undefined && (_["fiscal_quarter.gte"] = O), N !== undefined && (_["fiscal_quarter.lt"] = N), T !== undefined && (_["fiscal_quarter.lte"] = T), K !== undefined && (_.timeframe = K), W !== undefined && (_["timeframe.any_of"] = W), I !== undefined && (_["timeframe.gt"] = I), V !== undefined && (_["timeframe.gte"] = V), v !== undefined && (_["timeframe.lt"] = v), te !== undefined && (_["timeframe.lte"] = te), ee !== undefined && (_.max_ticker = ee), se !== undefined && (_["max_ticker.any_of"] = se), ie !== undefined && (_["max_ticker.gt"] = ie), $ !== undefined && (_["max_ticker.gte"] = $), oe !== undefined && (_["max_ticker.lt"] = oe), re !== undefined && (_["max_ticker.lte"] = re), L !== undefined && (_.min_ticker = L), ae !== undefined && (_["min_ticker.any_of"] = ae), ce !== undefined && (_["min_ticker.gt"] = ce), pe !== undefined && (_["min_ticker.gte"] = pe), fe !== undefined && (_["min_ticker.lt"] = fe), de !== undefined && (_["min_ticker.lte"] = de), le !== undefined && (_.limit = le), ue !== undefined && (_.sort = ue), z(ye, _);
    let me = ge && ge.headers ? ge.headers : {};
    return be.headers = { ...Z, ...me, ...X.headers }, { url: E(ye), options: be };
  }, getStocksFinancialsV1CashFlowStatements: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X = {}) => {
    let J = "/stocks/financials/v1/cash-flow-statements", ye = new URL(J, B), ge;
    a && (ge = a.baseOptions);
    let be = { method: "GET", ...ge, ...X }, Z = {}, _ = {};
    await U(_, "apiKey", a), e !== undefined && (_.cik = e), t !== undefined && (_["cik.any_of"] = t), i !== undefined && (_["cik.gt"] = i), n !== undefined && (_["cik.gte"] = n), s !== undefined && (_["cik.lt"] = s), o !== undefined && (_["cik.lte"] = o), r !== undefined && (_.period_end = r), d !== undefined && (_["period_end.gt"] = d), l !== undefined && (_["period_end.gte"] = l), g !== undefined && (_["period_end.lt"] = g), y !== undefined && (_["period_end.lte"] = y), p !== undefined && (_.filing_date = p), f !== undefined && (_["filing_date.gt"] = f), m !== undefined && (_["filing_date.gte"] = m), u !== undefined && (_["filing_date.lt"] = u), b !== undefined && (_["filing_date.lte"] = b), h !== undefined && (_.tickers = h), x !== undefined && (_["tickers.all_of"] = x), R !== undefined && (_["tickers.any_of"] = R), c !== undefined && (_.fiscal_year = c), k !== undefined && (_["fiscal_year.gt"] = k), A !== undefined && (_["fiscal_year.gte"] = A), G !== undefined && (_["fiscal_year.lt"] = G), S !== undefined && (_["fiscal_year.lte"] = S), C !== undefined && (_.fiscal_quarter = C), w !== undefined && (_["fiscal_quarter.gt"] = w), O !== undefined && (_["fiscal_quarter.gte"] = O), N !== undefined && (_["fiscal_quarter.lt"] = N), T !== undefined && (_["fiscal_quarter.lte"] = T), K !== undefined && (_.timeframe = K), W !== undefined && (_["timeframe.any_of"] = W), I !== undefined && (_["timeframe.gt"] = I), V !== undefined && (_["timeframe.gte"] = V), v !== undefined && (_["timeframe.lt"] = v), te !== undefined && (_["timeframe.lte"] = te), ee !== undefined && (_.max_ticker = ee), se !== undefined && (_["max_ticker.any_of"] = se), ie !== undefined && (_["max_ticker.gt"] = ie), $ !== undefined && (_["max_ticker.gte"] = $), oe !== undefined && (_["max_ticker.lt"] = oe), re !== undefined && (_["max_ticker.lte"] = re), L !== undefined && (_.min_ticker = L), ae !== undefined && (_["min_ticker.any_of"] = ae), ce !== undefined && (_["min_ticker.gt"] = ce), pe !== undefined && (_["min_ticker.gte"] = pe), fe !== undefined && (_["min_ticker.lt"] = fe), de !== undefined && (_["min_ticker.lte"] = de), le !== undefined && (_.limit = le), ue !== undefined && (_.sort = ue), z(ye, _);
    let me = ge && ge.headers ? ge.headers : {};
    return be.headers = { ...Z, ...me, ...X.headers }, { url: E(ye), options: be };
  }, getStocksFinancialsV1IncomeStatements: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X = {}) => {
    let J = "/stocks/financials/v1/income-statements", ye = new URL(J, B), ge;
    a && (ge = a.baseOptions);
    let be = { method: "GET", ...ge, ...X }, Z = {}, _ = {};
    await U(_, "apiKey", a), e !== undefined && (_.cik = e), t !== undefined && (_["cik.any_of"] = t), i !== undefined && (_["cik.gt"] = i), n !== undefined && (_["cik.gte"] = n), s !== undefined && (_["cik.lt"] = s), o !== undefined && (_["cik.lte"] = o), r !== undefined && (_.tickers = r), d !== undefined && (_["tickers.all_of"] = d), l !== undefined && (_["tickers.any_of"] = l), g !== undefined && (_.period_end = g), y !== undefined && (_["period_end.gt"] = y), p !== undefined && (_["period_end.gte"] = p), f !== undefined && (_["period_end.lt"] = f), m !== undefined && (_["period_end.lte"] = m), u !== undefined && (_.filing_date = u), b !== undefined && (_["filing_date.gt"] = b), h !== undefined && (_["filing_date.gte"] = h), x !== undefined && (_["filing_date.lt"] = x), R !== undefined && (_["filing_date.lte"] = R), c !== undefined && (_.fiscal_year = c), k !== undefined && (_["fiscal_year.gt"] = k), A !== undefined && (_["fiscal_year.gte"] = A), G !== undefined && (_["fiscal_year.lt"] = G), S !== undefined && (_["fiscal_year.lte"] = S), C !== undefined && (_.fiscal_quarter = C), w !== undefined && (_["fiscal_quarter.gt"] = w), O !== undefined && (_["fiscal_quarter.gte"] = O), N !== undefined && (_["fiscal_quarter.lt"] = N), T !== undefined && (_["fiscal_quarter.lte"] = T), K !== undefined && (_.timeframe = K), W !== undefined && (_["timeframe.any_of"] = W), I !== undefined && (_["timeframe.gt"] = I), V !== undefined && (_["timeframe.gte"] = V), v !== undefined && (_["timeframe.lt"] = v), te !== undefined && (_["timeframe.lte"] = te), ee !== undefined && (_.max_ticker = ee), se !== undefined && (_["max_ticker.any_of"] = se), ie !== undefined && (_["max_ticker.gt"] = ie), $ !== undefined && (_["max_ticker.gte"] = $), oe !== undefined && (_["max_ticker.lt"] = oe), re !== undefined && (_["max_ticker.lte"] = re), L !== undefined && (_.min_ticker = L), ae !== undefined && (_["min_ticker.any_of"] = ae), ce !== undefined && (_["min_ticker.gt"] = ce), pe !== undefined && (_["min_ticker.gte"] = pe), fe !== undefined && (_["min_ticker.lt"] = fe), de !== undefined && (_["min_ticker.lte"] = de), le !== undefined && (_.limit = le), ue !== undefined && (_.sort = ue), z(ye, _);
    let me = ge && ge.headers ? ge.headers : {};
    return be.headers = { ...Z, ...me, ...X.headers }, { url: E(ye), options: be };
  }, getStocksFinancialsV1Ratios: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _, me, he, xe, Re, P, Ae, ne, Ge, Oe, Ce, Ve, Se, we, ve, Te, Ie, ke, Le, De, q, Be, Ue, ze, Ee, Qe, Me, He, je, Ke, Ne, $e, Ye, We, Xe, Je, Ze, qe, Pe, en, nn, tn, sn, on, rn, an, dn, ln, gn, cn, pn, fn, un, yn, bn, mn, hn, Rn, xn, An = {}) => {
    let Sn = "/stocks/financials/v1/ratios", kn = new URL(Sn, B), Fe;
    a && (Fe = a.baseOptions);
    let _n = { method: "GET", ...Fe, ...An }, wn = {}, j = {};
    await U(j, "apiKey", a), e !== undefined && (j.ticker = e), t !== undefined && (j["ticker.any_of"] = t), i !== undefined && (j["ticker.gt"] = i), n !== undefined && (j["ticker.gte"] = n), s !== undefined && (j["ticker.lt"] = s), o !== undefined && (j["ticker.lte"] = o), r !== undefined && (j.cik = r), d !== undefined && (j["cik.any_of"] = d), l !== undefined && (j["cik.gt"] = l), g !== undefined && (j["cik.gte"] = g), y !== undefined && (j["cik.lt"] = y), p !== undefined && (j["cik.lte"] = p), f !== undefined && (j.price = f), m !== undefined && (j["price.gt"] = m), u !== undefined && (j["price.gte"] = u), b !== undefined && (j["price.lt"] = b), h !== undefined && (j["price.lte"] = h), x !== undefined && (j.average_volume = x), R !== undefined && (j["average_volume.gt"] = R), c !== undefined && (j["average_volume.gte"] = c), k !== undefined && (j["average_volume.lt"] = k), A !== undefined && (j["average_volume.lte"] = A), G !== undefined && (j.market_cap = G), S !== undefined && (j["market_cap.gt"] = S), C !== undefined && (j["market_cap.gte"] = C), w !== undefined && (j["market_cap.lt"] = w), O !== undefined && (j["market_cap.lte"] = O), N !== undefined && (j.earnings_per_share = N), T !== undefined && (j["earnings_per_share.gt"] = T), K !== undefined && (j["earnings_per_share.gte"] = K), W !== undefined && (j["earnings_per_share.lt"] = W), I !== undefined && (j["earnings_per_share.lte"] = I), V !== undefined && (j.price_to_earnings = V), v !== undefined && (j["price_to_earnings.gt"] = v), te !== undefined && (j["price_to_earnings.gte"] = te), ee !== undefined && (j["price_to_earnings.lt"] = ee), se !== undefined && (j["price_to_earnings.lte"] = se), ie !== undefined && (j.price_to_book = ie), $ !== undefined && (j["price_to_book.gt"] = $), oe !== undefined && (j["price_to_book.gte"] = oe), re !== undefined && (j["price_to_book.lt"] = re), L !== undefined && (j["price_to_book.lte"] = L), ae !== undefined && (j.price_to_sales = ae), ce !== undefined && (j["price_to_sales.gt"] = ce), pe !== undefined && (j["price_to_sales.gte"] = pe), fe !== undefined && (j["price_to_sales.lt"] = fe), de !== undefined && (j["price_to_sales.lte"] = de), le !== undefined && (j.price_to_cash_flow = le), ue !== undefined && (j["price_to_cash_flow.gt"] = ue), X !== undefined && (j["price_to_cash_flow.gte"] = X), J !== undefined && (j["price_to_cash_flow.lt"] = J), ye !== undefined && (j["price_to_cash_flow.lte"] = ye), ge !== undefined && (j.price_to_free_cash_flow = ge), be !== undefined && (j["price_to_free_cash_flow.gt"] = be), Z !== undefined && (j["price_to_free_cash_flow.gte"] = Z), _ !== undefined && (j["price_to_free_cash_flow.lt"] = _), me !== undefined && (j["price_to_free_cash_flow.lte"] = me), he !== undefined && (j.dividend_yield = he), xe !== undefined && (j["dividend_yield.gt"] = xe), Re !== undefined && (j["dividend_yield.gte"] = Re), P !== undefined && (j["dividend_yield.lt"] = P), Ae !== undefined && (j["dividend_yield.lte"] = Ae), ne !== undefined && (j.return_on_assets = ne), Ge !== undefined && (j["return_on_assets.gt"] = Ge), Oe !== undefined && (j["return_on_assets.gte"] = Oe), Ce !== undefined && (j["return_on_assets.lt"] = Ce), Ve !== undefined && (j["return_on_assets.lte"] = Ve), Se !== undefined && (j.return_on_equity = Se), we !== undefined && (j["return_on_equity.gt"] = we), ve !== undefined && (j["return_on_equity.gte"] = ve), Te !== undefined && (j["return_on_equity.lt"] = Te), Ie !== undefined && (j["return_on_equity.lte"] = Ie), ke !== undefined && (j.debt_to_equity = ke), Le !== undefined && (j["debt_to_equity.gt"] = Le), De !== undefined && (j["debt_to_equity.gte"] = De), q !== undefined && (j["debt_to_equity.lt"] = q), Be !== undefined && (j["debt_to_equity.lte"] = Be), Ue !== undefined && (j.current = Ue), ze !== undefined && (j["current.gt"] = ze), Ee !== undefined && (j["current.gte"] = Ee), Qe !== undefined && (j["current.lt"] = Qe), Me !== undefined && (j["current.lte"] = Me), He !== undefined && (j.quick = He), je !== undefined && (j["quick.gt"] = je), Ke !== undefined && (j["quick.gte"] = Ke), Ne !== undefined && (j["quick.lt"] = Ne), $e !== undefined && (j["quick.lte"] = $e), Ye !== undefined && (j.cash = Ye), We !== undefined && (j["cash.gt"] = We), Xe !== undefined && (j["cash.gte"] = Xe), Je !== undefined && (j["cash.lt"] = Je), Ze !== undefined && (j["cash.lte"] = Ze), qe !== undefined && (j.ev_to_sales = qe), Pe !== undefined && (j["ev_to_sales.gt"] = Pe), en !== undefined && (j["ev_to_sales.gte"] = en), nn !== undefined && (j["ev_to_sales.lt"] = nn), tn !== undefined && (j["ev_to_sales.lte"] = tn), sn !== undefined && (j.ev_to_ebitda = sn), on !== undefined && (j["ev_to_ebitda.gt"] = on), rn !== undefined && (j["ev_to_ebitda.gte"] = rn), an !== undefined && (j["ev_to_ebitda.lt"] = an), dn !== undefined && (j["ev_to_ebitda.lte"] = dn), ln !== undefined && (j.enterprise_value = ln), gn !== undefined && (j["enterprise_value.gt"] = gn), cn !== undefined && (j["enterprise_value.gte"] = cn), pn !== undefined && (j["enterprise_value.lt"] = pn), fn !== undefined && (j["enterprise_value.lte"] = fn), un !== undefined && (j.free_cash_flow = un), yn !== undefined && (j["free_cash_flow.gt"] = yn), bn !== undefined && (j["free_cash_flow.gte"] = bn), mn !== undefined && (j["free_cash_flow.lt"] = mn), hn !== undefined && (j["free_cash_flow.lte"] = hn), Rn !== undefined && (j.limit = Rn), xn !== undefined && (j.sort = xn), z(kn, j);
    let zn = Fe && Fe.headers ? Fe.headers : {};
    return _n.headers = { ...wn, ...zn, ...An.headers }, { url: E(kn), options: _n };
  }, getStocksMACD: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b = {}) => {
    Y("getStocksMACD", "stockTicker", e);
    let h = "/v1/indicators/macd/{stockTicker}".replace("{stockTicker}", encodeURIComponent(String(e))), x = new URL(h, B), R;
    a && (R = a.baseOptions);
    let c = { method: "GET", ...R, ...b }, k = {}, A = {};
    await U(A, "apiKey", a), t !== undefined && (A.timestamp = t), i !== undefined && (A.timespan = i), n !== undefined && (A.adjusted = n), s !== undefined && (A.short_window = s), o !== undefined && (A.long_window = o), r !== undefined && (A.signal_window = r), d !== undefined && (A.series_type = d), l !== undefined && (A.expand_underlying = l), g !== undefined && (A.order = g), y !== undefined && (A.limit = y), p !== undefined && (A["timestamp.gte"] = p), f !== undefined && (A["timestamp.gt"] = f), m !== undefined && (A["timestamp.lte"] = m), u !== undefined && (A["timestamp.lt"] = u), z(x, A);
    let G = R && R.headers ? R.headers : {};
    return c.headers = { ...k, ...G, ...b.headers }, { url: E(x), options: c };
  }, getStocksOpenClose: async (e, t, i, n = {}) => {
    Y("getStocksOpenClose", "stocksTicker", e), Y("getStocksOpenClose", "date", t);
    let s = "/v1/open-close/{stocksTicker}/{date}".replace("{stocksTicker}", encodeURIComponent(String(e))).replace("{date}", encodeURIComponent(String(t))), o = new URL(s, B), r;
    a && (r = a.baseOptions);
    let d = { method: "GET", ...r, ...n }, l = {}, g = {};
    await U(g, "apiKey", a), i !== undefined && (g.adjusted = i), z(o, g);
    let y = r && r.headers ? r.headers : {};
    return d.headers = { ...l, ...y, ...n.headers }, { url: E(o), options: d };
  }, getStocksQuotes: async (e, t, i, n, s, o, r, d, l, g = {}) => {
    Y("getStocksQuotes", "stockTicker", e);
    let y = "/v3/quotes/{stockTicker}".replace("{stockTicker}", encodeURIComponent(String(e))), p = new URL(y, B), f;
    a && (f = a.baseOptions);
    let m = { method: "GET", ...f, ...g }, u = {}, b = {};
    await U(b, "apiKey", a), t !== undefined && (b.timestamp = t), i !== undefined && (b["timestamp.gte"] = i), n !== undefined && (b["timestamp.gt"] = n), s !== undefined && (b["timestamp.lte"] = s), o !== undefined && (b["timestamp.lt"] = o), r !== undefined && (b.order = r), d !== undefined && (b.limit = d), l !== undefined && (b.sort = l), z(p, b);
    let h = f && f.headers ? f.headers : {};
    return m.headers = { ...u, ...h, ...g.headers }, { url: E(p), options: m };
  }, getStocksRSI: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getStocksRSI", "stockTicker", e);
    let u = "/v1/indicators/rsi/{stockTicker}".replace("{stockTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getStocksSMA: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    Y("getStocksSMA", "stockTicker", e);
    let u = "/v1/indicators/sma/{stockTicker}".replace("{stockTicker}", encodeURIComponent(String(e))), b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), t !== undefined && (c.timestamp = t), i !== undefined && (c.timespan = i), n !== undefined && (c.adjusted = n), s !== undefined && (c.window = s), o !== undefined && (c.series_type = o), r !== undefined && (c.expand_underlying = r), d !== undefined && (c.order = d), l !== undefined && (c.limit = l), g !== undefined && (c["timestamp.gte"] = g), y !== undefined && (c["timestamp.gt"] = y), p !== undefined && (c["timestamp.lte"] = p), f !== undefined && (c["timestamp.lt"] = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getStocksSnapshotDirection: async (e, t, i = {}) => {
    Y("getStocksSnapshotDirection", "direction", e);
    let n = "/v2/snapshot/locale/us/markets/stocks/{direction}".replace("{direction}", encodeURIComponent(String(e))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), t !== undefined && (l.include_otc = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getStocksSnapshotTicker: async (e, t = {}) => {
    Y("getStocksSnapshotTicker", "stocksTicker", e);
    let i = "/v2/snapshot/locale/us/markets/stocks/tickers/{stocksTicker}".replace("{stocksTicker}", encodeURIComponent(String(e))), n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getStocksSnapshotTickers: async (e, t, i = {}) => {
    let n = "/v2/snapshot/locale/us/markets/stocks/tickers", s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), e && (l.tickers = e), t !== undefined && (l.include_otc = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getStocksTaxonomiesVXRiskFactors: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w = {}) => {
    let O = "/stocks/taxonomies/vX/risk-factors", N = new URL(O, B), T;
    a && (T = a.baseOptions);
    let K = { method: "GET", ...T, ...w }, W = {}, I = {};
    await U(I, "apiKey", a), e !== undefined && (I.taxonomy = e), t !== undefined && (I["taxonomy.gt"] = t), i !== undefined && (I["taxonomy.gte"] = i), n !== undefined && (I["taxonomy.lt"] = n), s !== undefined && (I["taxonomy.lte"] = s), o !== undefined && (I.primary_category = o), r !== undefined && (I["primary_category.any_of"] = r), d !== undefined && (I["primary_category.gt"] = d), l !== undefined && (I["primary_category.gte"] = l), g !== undefined && (I["primary_category.lt"] = g), y !== undefined && (I["primary_category.lte"] = y), p !== undefined && (I.secondary_category = p), f !== undefined && (I["secondary_category.any_of"] = f), m !== undefined && (I["secondary_category.gt"] = m), u !== undefined && (I["secondary_category.gte"] = u), b !== undefined && (I["secondary_category.lt"] = b), h !== undefined && (I["secondary_category.lte"] = h), x !== undefined && (I.tertiary_category = x), R !== undefined && (I["tertiary_category.any_of"] = R), c !== undefined && (I["tertiary_category.gt"] = c), k !== undefined && (I["tertiary_category.gte"] = k), A !== undefined && (I["tertiary_category.lt"] = A), G !== undefined && (I["tertiary_category.lte"] = G), S !== undefined && (I.limit = S), C !== undefined && (I.sort = C), z(N, I);
    let V = T && T.headers ? T.headers : {};
    return K.headers = { ...W, ...V, ...w.headers }, { url: E(N), options: K };
  }, getStocksTrades: async (e, t, i, n, s, o, r, d, l, g = {}) => {
    Y("getStocksTrades", "stockTicker", e);
    let y = "/v3/trades/{stockTicker}".replace("{stockTicker}", encodeURIComponent(String(e))), p = new URL(y, B), f;
    a && (f = a.baseOptions);
    let m = { method: "GET", ...f, ...g }, u = {}, b = {};
    await U(b, "apiKey", a), t !== undefined && (b.timestamp = t), i !== undefined && (b["timestamp.gte"] = i), n !== undefined && (b["timestamp.gt"] = n), s !== undefined && (b["timestamp.lte"] = s), o !== undefined && (b["timestamp.lt"] = o), r !== undefined && (b.order = r), d !== undefined && (b.limit = d), l !== undefined && (b.sort = l), z(p, b);
    let h = f && f.headers ? f.headers : {};
    return m.headers = { ...u, ...h, ...g.headers }, { url: E(p), options: m };
  }, getStocksV1Dividends: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k = {}) => {
    let A = "/stocks/v1/dividends", G = new URL(A, B), S;
    a && (S = a.baseOptions);
    let C = { method: "GET", ...S, ...k }, w = {}, O = {};
    await U(O, "apiKey", a), e !== undefined && (O.ticker = e), t !== undefined && (O["ticker.any_of"] = t), i !== undefined && (O["ticker.gt"] = i), n !== undefined && (O["ticker.gte"] = n), s !== undefined && (O["ticker.lt"] = s), o !== undefined && (O["ticker.lte"] = o), r !== undefined && (O.ex_dividend_date = r), d !== undefined && (O["ex_dividend_date.gt"] = d), l !== undefined && (O["ex_dividend_date.gte"] = l), g !== undefined && (O["ex_dividend_date.lt"] = g), y !== undefined && (O["ex_dividend_date.lte"] = y), p !== undefined && (O.frequency = p), f !== undefined && (O["frequency.gt"] = f), m !== undefined && (O["frequency.gte"] = m), u !== undefined && (O["frequency.lt"] = u), b !== undefined && (O["frequency.lte"] = b), h !== undefined && (O.distribution_type = h), x !== undefined && (O["distribution_type.any_of"] = x), R !== undefined && (O.limit = R), c !== undefined && (O.sort = c), z(G, O);
    let N = S && S.headers ? S.headers : {};
    return C.headers = { ...w, ...N, ...k.headers }, { url: E(G), options: C };
  }, getStocksV1Exchanges: async (e, t = {}) => {
    let i = "/stocks/v1/exchanges", n = new URL(i, B), s;
    a && (s = a.baseOptions);
    let o = { method: "GET", ...s, ...t }, r = {}, d = {};
    await U(d, "apiKey", a), e !== undefined && (d.limit = e), z(n, d);
    let l = s && s.headers ? s.headers : {};
    return o.headers = { ...r, ...l, ...t.headers }, { url: E(n), options: o };
  }, getStocksV1ShortInterest: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O = {}) => {
    let N = "/stocks/v1/short-interest", T = new URL(N, B), K;
    a && (K = a.baseOptions);
    let W = { method: "GET", ...K, ...O }, I = {}, V = {};
    await U(V, "apiKey", a), e !== undefined && (V.ticker = e), t !== undefined && (V["ticker.any_of"] = t), i !== undefined && (V["ticker.gt"] = i), n !== undefined && (V["ticker.gte"] = n), s !== undefined && (V["ticker.lt"] = s), o !== undefined && (V["ticker.lte"] = o), r !== undefined && (V.days_to_cover = r), d !== undefined && (V["days_to_cover.any_of"] = d), l !== undefined && (V["days_to_cover.gt"] = l), g !== undefined && (V["days_to_cover.gte"] = g), y !== undefined && (V["days_to_cover.lt"] = y), p !== undefined && (V["days_to_cover.lte"] = p), f !== undefined && (V.settlement_date = f), m !== undefined && (V["settlement_date.any_of"] = m), u !== undefined && (V["settlement_date.gt"] = u), b !== undefined && (V["settlement_date.gte"] = b), h !== undefined && (V["settlement_date.lt"] = h), x !== undefined && (V["settlement_date.lte"] = x), R !== undefined && (V.avg_daily_volume = R), c !== undefined && (V["avg_daily_volume.any_of"] = c), k !== undefined && (V["avg_daily_volume.gt"] = k), A !== undefined && (V["avg_daily_volume.gte"] = A), G !== undefined && (V["avg_daily_volume.lt"] = G), S !== undefined && (V["avg_daily_volume.lte"] = S), C !== undefined && (V.limit = C), w !== undefined && (V.sort = w), z(T, V);
    let v = K && K.headers ? K.headers : {};
    return W.headers = { ...I, ...v, ...O.headers }, { url: E(T), options: W };
  }, getStocksV1ShortVolume: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O = {}) => {
    let N = "/stocks/v1/short-volume", T = new URL(N, B), K;
    a && (K = a.baseOptions);
    let W = { method: "GET", ...K, ...O }, I = {}, V = {};
    await U(V, "apiKey", a), e !== undefined && (V.ticker = e), t !== undefined && (V["ticker.any_of"] = t), i !== undefined && (V["ticker.gt"] = i), n !== undefined && (V["ticker.gte"] = n), s !== undefined && (V["ticker.lt"] = s), o !== undefined && (V["ticker.lte"] = o), r !== undefined && (V.date = r), d !== undefined && (V["date.any_of"] = d), l !== undefined && (V["date.gt"] = l), g !== undefined && (V["date.gte"] = g), y !== undefined && (V["date.lt"] = y), p !== undefined && (V["date.lte"] = p), f !== undefined && (V.short_volume_ratio = f), m !== undefined && (V["short_volume_ratio.any_of"] = m), u !== undefined && (V["short_volume_ratio.gt"] = u), b !== undefined && (V["short_volume_ratio.gte"] = b), h !== undefined && (V["short_volume_ratio.lt"] = h), x !== undefined && (V["short_volume_ratio.lte"] = x), R !== undefined && (V.total_volume = R), c !== undefined && (V["total_volume.any_of"] = c), k !== undefined && (V["total_volume.gt"] = k), A !== undefined && (V["total_volume.gte"] = A), G !== undefined && (V["total_volume.lt"] = G), S !== undefined && (V["total_volume.lte"] = S), C !== undefined && (V.limit = C), w !== undefined && (V.sort = w), z(T, V);
    let v = K && K.headers ? K.headers : {};
    return W.headers = { ...I, ...v, ...O.headers }, { url: E(T), options: W };
  }, getStocksV1Splits: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b = {}) => {
    let h = "/stocks/v1/splits", x = new URL(h, B), R;
    a && (R = a.baseOptions);
    let c = { method: "GET", ...R, ...b }, k = {}, A = {};
    await U(A, "apiKey", a), e !== undefined && (A.ticker = e), t !== undefined && (A["ticker.any_of"] = t), i !== undefined && (A["ticker.gt"] = i), n !== undefined && (A["ticker.gte"] = n), s !== undefined && (A["ticker.lt"] = s), o !== undefined && (A["ticker.lte"] = o), r !== undefined && (A.execution_date = r), d !== undefined && (A["execution_date.gt"] = d), l !== undefined && (A["execution_date.gte"] = l), g !== undefined && (A["execution_date.lt"] = g), y !== undefined && (A["execution_date.lte"] = y), p !== undefined && (A.adjustment_type = p), f !== undefined && (A["adjustment_type.any_of"] = f), m !== undefined && (A.limit = m), u !== undefined && (A.sort = u), z(x, A);
    let G = R && R.headers ? R.headers : {};
    return c.headers = { ...k, ...G, ...b.headers }, { url: E(x), options: c };
  }, getStocksVXFloat: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    let u = "/stocks/vX/float", b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    await U(c, "apiKey", a), e !== undefined && (c.ticker = e), t !== undefined && (c["ticker.any_of"] = t), i !== undefined && (c["ticker.gt"] = i), n !== undefined && (c["ticker.gte"] = n), s !== undefined && (c["ticker.lt"] = s), o !== undefined && (c["ticker.lte"] = o), r !== undefined && (c.free_float_percent = r), d !== undefined && (c["free_float_percent.gt"] = d), l !== undefined && (c["free_float_percent.gte"] = l), g !== undefined && (c["free_float_percent.lt"] = g), y !== undefined && (c["free_float_percent.lte"] = y), p !== undefined && (c.limit = p), f !== undefined && (c.sort = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, getTicker: async (e, t, i = {}) => {
    Y("getTicker", "ticker", e);
    let n = "/v3/reference/tickers/{ticker}".replace("{ticker}", encodeURIComponent(String(e))), s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), t !== undefined && (l.date = t instanceof Date ? t.toISOString().substring(0, 10) : t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, getTmxV1CorporateEvents: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X = {}) => {
    let J = "/tmx/v1/corporate-events", ye = new URL(J, B), ge;
    a && (ge = a.baseOptions);
    let be = { method: "GET", ...ge, ...X }, Z = {}, _ = {};
    await U(_, "apiKey", a), e !== undefined && (_.date = e), t !== undefined && (_["date.any_of"] = t), i !== undefined && (_["date.gt"] = i), n !== undefined && (_["date.gte"] = n), s !== undefined && (_["date.lt"] = s), o !== undefined && (_["date.lte"] = o), r !== undefined && (_.type = r), d !== undefined && (_["type.any_of"] = d), l !== undefined && (_["type.gt"] = l), g !== undefined && (_["type.gte"] = g), y !== undefined && (_["type.lt"] = y), p !== undefined && (_["type.lte"] = p), f !== undefined && (_.status = f), m !== undefined && (_["status.any_of"] = m), u !== undefined && (_["status.gt"] = u), b !== undefined && (_["status.gte"] = b), h !== undefined && (_["status.lt"] = h), x !== undefined && (_["status.lte"] = x), R !== undefined && (_.ticker = R), c !== undefined && (_["ticker.any_of"] = c), k !== undefined && (_["ticker.gt"] = k), A !== undefined && (_["ticker.gte"] = A), G !== undefined && (_["ticker.lt"] = G), S !== undefined && (_["ticker.lte"] = S), C !== undefined && (_.isin = C), w !== undefined && (_["isin.any_of"] = w), O !== undefined && (_["isin.gt"] = O), N !== undefined && (_["isin.gte"] = N), T !== undefined && (_["isin.lt"] = T), K !== undefined && (_["isin.lte"] = K), W !== undefined && (_.trading_venue = W), I !== undefined && (_["trading_venue.any_of"] = I), V !== undefined && (_["trading_venue.gt"] = V), v !== undefined && (_["trading_venue.gte"] = v), te !== undefined && (_["trading_venue.lt"] = te), ee !== undefined && (_["trading_venue.lte"] = ee), se !== undefined && (_.tmx_company_id = se), ie !== undefined && (_["tmx_company_id.gt"] = ie), $ !== undefined && (_["tmx_company_id.gte"] = $), oe !== undefined && (_["tmx_company_id.lt"] = oe), re !== undefined && (_["tmx_company_id.lte"] = re), L !== undefined && (_.tmx_record_id = L), ae !== undefined && (_["tmx_record_id.any_of"] = ae), ce !== undefined && (_["tmx_record_id.gt"] = ce), pe !== undefined && (_["tmx_record_id.gte"] = pe), fe !== undefined && (_["tmx_record_id.lt"] = fe), de !== undefined && (_["tmx_record_id.lte"] = de), le !== undefined && (_.limit = le), ue !== undefined && (_.sort = ue), z(ye, _);
    let me = ge && ge.headers ? ge.headers : {};
    return be.headers = { ...Z, ...me, ...X.headers }, { url: E(ye), options: be };
  }, listConditions: async (e, t, i, n, s, o, r, d = {}) => {
    let l = "/v3/reference/conditions", g = new URL(l, B), y;
    a && (y = a.baseOptions);
    let p = { method: "GET", ...y, ...d }, f = {}, m = {};
    await U(m, "apiKey", a), e !== undefined && (m.asset_class = e), t !== undefined && (m.data_type = t), i !== undefined && (m.id = i), n !== undefined && (m.sip = n), s !== undefined && (m.order = s), o !== undefined && (m.limit = o), r !== undefined && (m.sort = r), z(g, m);
    let u = y && y.headers ? y.headers : {};
    return p.headers = { ...f, ...u, ...d.headers }, { url: E(g), options: p };
  }, listDividends: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee = {}) => {
    let se = "/v3/reference/dividends", ie = new URL(se, B), $;
    a && ($ = a.baseOptions);
    let oe = { method: "GET", ...$, ...ee }, re = {}, L = {};
    await U(L, "apiKey", a), e !== undefined && (L.ticker = e), t !== undefined && (L.ex_dividend_date = t instanceof Date ? t.toISOString().substring(0, 10) : t), i !== undefined && (L.record_date = i instanceof Date ? i.toISOString().substring(0, 10) : i), n !== undefined && (L.declaration_date = n instanceof Date ? n.toISOString().substring(0, 10) : n), s !== undefined && (L.pay_date = s instanceof Date ? s.toISOString().substring(0, 10) : s), o !== undefined && (L.frequency = o), r !== undefined && (L.cash_amount = r), d !== undefined && (L.dividend_type = d), l !== undefined && (L["ticker.gte"] = l), g !== undefined && (L["ticker.gt"] = g), y !== undefined && (L["ticker.lte"] = y), p !== undefined && (L["ticker.lt"] = p), f !== undefined && (L["ex_dividend_date.gte"] = f instanceof Date ? f.toISOString().substring(0, 10) : f), m !== undefined && (L["ex_dividend_date.gt"] = m instanceof Date ? m.toISOString().substring(0, 10) : m), u !== undefined && (L["ex_dividend_date.lte"] = u instanceof Date ? u.toISOString().substring(0, 10) : u), b !== undefined && (L["ex_dividend_date.lt"] = b instanceof Date ? b.toISOString().substring(0, 10) : b), h !== undefined && (L["record_date.gte"] = h instanceof Date ? h.toISOString().substring(0, 10) : h), x !== undefined && (L["record_date.gt"] = x instanceof Date ? x.toISOString().substring(0, 10) : x), R !== undefined && (L["record_date.lte"] = R instanceof Date ? R.toISOString().substring(0, 10) : R), c !== undefined && (L["record_date.lt"] = c instanceof Date ? c.toISOString().substring(0, 10) : c), k !== undefined && (L["declaration_date.gte"] = k instanceof Date ? k.toISOString().substring(0, 10) : k), A !== undefined && (L["declaration_date.gt"] = A instanceof Date ? A.toISOString().substring(0, 10) : A), G !== undefined && (L["declaration_date.lte"] = G instanceof Date ? G.toISOString().substring(0, 10) : G), S !== undefined && (L["declaration_date.lt"] = S instanceof Date ? S.toISOString().substring(0, 10) : S), C !== undefined && (L["pay_date.gte"] = C instanceof Date ? C.toISOString().substring(0, 10) : C), w !== undefined && (L["pay_date.gt"] = w instanceof Date ? w.toISOString().substring(0, 10) : w), O !== undefined && (L["pay_date.lte"] = O instanceof Date ? O.toISOString().substring(0, 10) : O), N !== undefined && (L["pay_date.lt"] = N instanceof Date ? N.toISOString().substring(0, 10) : N), T !== undefined && (L["cash_amount.gte"] = T), K !== undefined && (L["cash_amount.gt"] = K), W !== undefined && (L["cash_amount.lte"] = W), I !== undefined && (L["cash_amount.lt"] = I), V !== undefined && (L.order = V), v !== undefined && (L.limit = v), te !== undefined && (L.sort = te), z(ie, L);
    let ae = $ && $.headers ? $.headers : {};
    return oe.headers = { ...re, ...ae, ...ee.headers }, { url: E(ie), options: oe };
  }, listExchanges: async (e, t, i = {}) => {
    let n = "/v3/reference/exchanges", s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), e !== undefined && (l.asset_class = e), t !== undefined && (l.locale = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, listFinancials: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k = {}) => {
    let A = "/vX/reference/financials", G = new URL(A, B), S;
    a && (S = a.baseOptions);
    let C = { method: "GET", ...S, ...k }, w = {}, O = {};
    await U(O, "apiKey", a), e !== undefined && (O.ticker = e), t !== undefined && (O.cik = t), i !== undefined && (O.company_name = i), n !== undefined && (O.sic = n), s !== undefined && (O.filing_date = s instanceof Date ? s.toISOString().substring(0, 10) : s), o !== undefined && (O.period_of_report_date = o instanceof Date ? o.toISOString().substring(0, 10) : o), r !== undefined && (O.timeframe = r), d !== undefined && (O.include_sources = d), l !== undefined && (O["company_name.search"] = l), g !== undefined && (O["filing_date.gte"] = g instanceof Date ? g.toISOString().substring(0, 10) : g), y !== undefined && (O["filing_date.gt"] = y instanceof Date ? y.toISOString().substring(0, 10) : y), p !== undefined && (O["filing_date.lte"] = p instanceof Date ? p.toISOString().substring(0, 10) : p), f !== undefined && (O["filing_date.lt"] = f instanceof Date ? f.toISOString().substring(0, 10) : f), m !== undefined && (O["period_of_report_date.gte"] = m instanceof Date ? m.toISOString().substring(0, 10) : m), u !== undefined && (O["period_of_report_date.gt"] = u instanceof Date ? u.toISOString().substring(0, 10) : u), b !== undefined && (O["period_of_report_date.lte"] = b instanceof Date ? b.toISOString().substring(0, 10) : b), h !== undefined && (O["period_of_report_date.lt"] = h instanceof Date ? h.toISOString().substring(0, 10) : h), x !== undefined && (O.order = x), R !== undefined && (O.limit = R), c !== undefined && (O.sort = c), z(G, O);
    let N = S && S.headers ? S.headers : {};
    return C.headers = { ...w, ...N, ...k.headers }, { url: E(G), options: C };
  }, listIPOs: async (e, t, i, n, s, o, r, d, l, g, y, p, f = {}) => {
    let m = "/vX/reference/ipos", u = new URL(m, B), b;
    a && (b = a.baseOptions);
    let h = { method: "GET", ...b, ...f }, x = {}, R = {};
    await U(R, "apiKey", a), e !== undefined && (R.ticker = e), t !== undefined && (R.us_code = t), i !== undefined && (R.isin = i), n !== undefined && (R.listing_date = n instanceof Date ? n.toISOString().substring(0, 10) : n), s !== undefined && (R.ipo_status = s), o !== undefined && (R["listing_date.gte"] = o instanceof Date ? o.toISOString().substring(0, 10) : o), r !== undefined && (R["listing_date.gt"] = r instanceof Date ? r.toISOString().substring(0, 10) : r), d !== undefined && (R["listing_date.lte"] = d instanceof Date ? d.toISOString().substring(0, 10) : d), l !== undefined && (R["listing_date.lt"] = l instanceof Date ? l.toISOString().substring(0, 10) : l), g !== undefined && (R.order = g), y !== undefined && (R.limit = y), p !== undefined && (R.sort = p), z(u, R);
    let c = b && b.headers ? b.headers : {};
    return h.headers = { ...x, ...c, ...f.headers }, { url: E(u), options: h };
  }, listNews: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m = {}) => {
    let u = "/v2/reference/news", b = new URL(u, B), h;
    a && (h = a.baseOptions);
    let x = { method: "GET", ...h, ...m }, R = {}, c = {};
    if (await U(c, "apiKey", a), e !== undefined && (c.ticker = e), t !== undefined)
      for (let [A, G] of Object.entries(t))
        c[A] = G;
    if (i !== undefined && (c["ticker.gte"] = i), n !== undefined && (c["ticker.gt"] = n), s !== undefined && (c["ticker.lte"] = s), o !== undefined && (c["ticker.lt"] = o), r !== undefined)
      for (let [A, G] of Object.entries(r))
        c[A] = G;
    if (d !== undefined)
      for (let [A, G] of Object.entries(d))
        c[A] = G;
    if (l !== undefined)
      for (let [A, G] of Object.entries(l))
        c[A] = G;
    if (g !== undefined)
      for (let [A, G] of Object.entries(g))
        c[A] = G;
    y !== undefined && (c.order = y), p !== undefined && (c.limit = p), f !== undefined && (c.sort = f), z(b, c);
    let k = h && h.headers ? h.headers : {};
    return x.headers = { ...R, ...k, ...m.headers }, { url: E(b), options: x };
  }, listOptionsContracts: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G = {}) => {
    let S = "/v3/reference/options/contracts", C = new URL(S, B), w;
    a && (w = a.baseOptions);
    let O = { method: "GET", ...w, ...G }, N = {}, T = {};
    await U(T, "apiKey", a), e !== undefined && (T.underlying_ticker = e), t !== undefined && (T.ticker = t), i !== undefined && (T.contract_type = i), n !== undefined && (T.expiration_date = n), s !== undefined && (T.as_of = s), o !== undefined && (T.strike_price = o), r !== undefined && (T.expired = r), d !== undefined && (T["underlying_ticker.gte"] = d), l !== undefined && (T["underlying_ticker.gt"] = l), g !== undefined && (T["underlying_ticker.lte"] = g), y !== undefined && (T["underlying_ticker.lt"] = y), p !== undefined && (T["expiration_date.gte"] = p), f !== undefined && (T["expiration_date.gt"] = f), m !== undefined && (T["expiration_date.lte"] = m), u !== undefined && (T["expiration_date.lt"] = u), b !== undefined && (T["strike_price.gte"] = b), h !== undefined && (T["strike_price.gt"] = h), x !== undefined && (T["strike_price.lte"] = x), R !== undefined && (T["strike_price.lt"] = R), c !== undefined && (T.order = c), k !== undefined && (T.limit = k), A !== undefined && (T.sort = A), z(C, T);
    let K = w && w.headers ? w.headers : {};
    return O.headers = { ...N, ...K, ...G.headers }, { url: E(C), options: O };
  }, listStockSplits: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u = {}) => {
    let b = "/v3/reference/splits", h = new URL(b, B), x;
    a && (x = a.baseOptions);
    let R = { method: "GET", ...x, ...u }, c = {}, k = {};
    await U(k, "apiKey", a), e !== undefined && (k.ticker = e), t !== undefined && (k.execution_date = t instanceof Date ? t.toISOString().substring(0, 10) : t), i !== undefined && (k.reverse_split = i), n !== undefined && (k["ticker.gte"] = n), s !== undefined && (k["ticker.gt"] = s), o !== undefined && (k["ticker.lte"] = o), r !== undefined && (k["ticker.lt"] = r), d !== undefined && (k["execution_date.gte"] = d instanceof Date ? d.toISOString().substring(0, 10) : d), l !== undefined && (k["execution_date.gt"] = l instanceof Date ? l.toISOString().substring(0, 10) : l), g !== undefined && (k["execution_date.lte"] = g instanceof Date ? g.toISOString().substring(0, 10) : g), y !== undefined && (k["execution_date.lt"] = y instanceof Date ? y.toISOString().substring(0, 10) : y), p !== undefined && (k.order = p), f !== undefined && (k.limit = f), m !== undefined && (k.sort = m), z(h, k);
    let A = x && x.headers ? x.headers : {};
    return R.headers = { ...c, ...A, ...u.headers }, { url: E(h), options: R };
  }, listTickerTypes: async (e, t, i = {}) => {
    let n = "/v3/reference/tickers/types", s = new URL(n, B), o;
    a && (o = a.baseOptions);
    let r = { method: "GET", ...o, ...i }, d = {}, l = {};
    await U(l, "apiKey", a), e !== undefined && (l.asset_class = e), t !== undefined && (l.locale = t), z(s, l);
    let g = o && o.headers ? o.headers : {};
    return r.headers = { ...d, ...g, ...i.headers }, { url: E(s), options: r };
  }, listTickers: async (e, t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h = {}) => {
    let x = "/v3/reference/tickers", R = new URL(x, B), c;
    a && (c = a.baseOptions);
    let k = { method: "GET", ...c, ...h }, A = {}, G = {};
    await U(G, "apiKey", a), e !== undefined && (G.ticker = e), t !== undefined && (G.type = t), i !== undefined && (G.market = i), n !== undefined && (G.exchange = n), s !== undefined && (G.cusip = s), o !== undefined && (G.cik = o), r !== undefined && (G.date = r instanceof Date ? r.toISOString().substring(0, 10) : r), d !== undefined && (G.search = d), l !== undefined && (G.active = l), g !== undefined && (G["ticker.gte"] = g), y !== undefined && (G["ticker.gt"] = y), p !== undefined && (G["ticker.lte"] = p), f !== undefined && (G["ticker.lt"] = f), m !== undefined && (G.order = m), u !== undefined && (G.limit = u), b !== undefined && (G.sort = b), z(R, G);
    let S = c && c.headers ? c.headers : {};
    return k.headers = { ...A, ...S, ...h.headers }, { url: E(R), options: k };
  } };
};
var M = function(a) {
  let e = di(a);
  return { async deprecatedGetCryptoSnapshotTickerBook(t, i) {
    let n = await e.deprecatedGetCryptoSnapshotTickerBook(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.deprecatedGetCryptoSnapshotTickerBook"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async deprecatedGetHistoricCryptoTrades(t, i, n, s, o, r) {
    let d = await e.deprecatedGetHistoricCryptoTrades(t, i, n, s, o, r), l = a?.serverIndex ?? 0, g = F["DefaultApi.deprecatedGetHistoricCryptoTrades"]?.[l]?.url;
    return (y, p) => Q(d, axios_default, D, a)(y, g || p);
  }, async deprecatedGetHistoricForexQuotes(t, i, n, s, o, r) {
    let d = await e.deprecatedGetHistoricForexQuotes(t, i, n, s, o, r), l = a?.serverIndex ?? 0, g = F["DefaultApi.deprecatedGetHistoricForexQuotes"]?.[l]?.url;
    return (y, p) => Q(d, axios_default, D, a)(y, g || p);
  }, async deprecatedGetHistoricStocksQuotes(t, i, n, s, o, r, d) {
    let l = await e.deprecatedGetHistoricStocksQuotes(t, i, n, s, o, r, d), g = a?.serverIndex ?? 0, y = F["DefaultApi.deprecatedGetHistoricStocksQuotes"]?.[g]?.url;
    return (p, f) => Q(l, axios_default, D, a)(p, y || f);
  }, async deprecatedGetHistoricStocksTrades(t, i, n, s, o, r, d) {
    let l = await e.deprecatedGetHistoricStocksTrades(t, i, n, s, o, r, d), g = a?.serverIndex ?? 0, y = F["DefaultApi.deprecatedGetHistoricStocksTrades"]?.[g]?.url;
    return (p, f) => Q(l, axios_default, D, a)(p, y || f);
  }, async getBenzingaV1AnalystInsights(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe) {
    let fe = await e.getBenzingaV1AnalystInsights(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe), de = a?.serverIndex ?? 0, le = F["DefaultApi.getBenzingaV1AnalystInsights"]?.[de]?.url;
    return (ue, X) => Q(fe, axios_default, D, a)(ue, le || X);
  }, async getBenzingaV1Analysts(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N) {
    let T = await e.getBenzingaV1Analysts(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N), K = a?.serverIndex ?? 0, W = F["DefaultApi.getBenzingaV1Analysts"]?.[K]?.url;
    return (I, V) => Q(T, axios_default, D, a)(I, W || V);
  }, async getBenzingaV1BullsBearsSay(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k) {
    let A = await e.getBenzingaV1BullsBearsSay(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k), G = a?.serverIndex ?? 0, S = F["DefaultApi.getBenzingaV1BullsBearsSay"]?.[G]?.url;
    return (C, w) => Q(A, axios_default, D, a)(C, S || w);
  }, async getBenzingaV1ConsensusRatings(t, i, n, s, o, r, d, l, g) {
    let y = await e.getBenzingaV1ConsensusRatings(t, i, n, s, o, r, d, l, g), p = a?.serverIndex ?? 0, f = F["DefaultApi.getBenzingaV1ConsensusRatings"]?.[p]?.url;
    return (m, u) => Q(y, axios_default, D, a)(m, f || u);
  }, async getBenzingaV1Earnings(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _, me, he) {
    let xe = await e.getBenzingaV1Earnings(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _, me, he), Re = a?.serverIndex ?? 0, P = F["DefaultApi.getBenzingaV1Earnings"]?.[Re]?.url;
    return (Ae, ne) => Q(xe, axios_default, D, a)(Ae, P || ne);
  }, async getBenzingaV1Firms(t, i, n, s, o, r, d, l, g) {
    let y = await e.getBenzingaV1Firms(t, i, n, s, o, r, d, l, g), p = a?.serverIndex ?? 0, f = F["DefaultApi.getBenzingaV1Firms"]?.[p]?.url;
    return (m, u) => Q(y, axios_default, D, a)(m, f || u);
  }, async getBenzingaV1Guidance(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe) {
    let de = await e.getBenzingaV1Guidance(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe), le = a?.serverIndex ?? 0, ue = F["DefaultApi.getBenzingaV1Guidance"]?.[le]?.url;
    return (X, J) => Q(de, axios_default, D, a)(X, ue || J);
  }, async getBenzingaV1Ratings(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _) {
    let me = await e.getBenzingaV1Ratings(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _), he = a?.serverIndex ?? 0, xe = F["DefaultApi.getBenzingaV1Ratings"]?.[he]?.url;
    return (Re, P) => Q(me, axios_default, D, a)(Re, xe || P);
  }, async getBenzingaV2News(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O) {
    let N = await e.getBenzingaV2News(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O), T = a?.serverIndex ?? 0, K = F["DefaultApi.getBenzingaV2News"]?.[T]?.url;
    return (W, I) => Q(N, axios_default, D, a)(W, K || I);
  }, async getCryptoAggregates(t, i, n, s, o, r, d, l, g) {
    let y = await e.getCryptoAggregates(t, i, n, s, o, r, d, l, g), p = a?.serverIndex ?? 0, f = F["DefaultApi.getCryptoAggregates"]?.[p]?.url;
    return (m, u) => Q(y, axios_default, D, a)(m, f || u);
  }, async getCryptoEMA(t, i, n, s, o, r, d, l, g, y, p, f, m) {
    let u = await e.getCryptoEMA(t, i, n, s, o, r, d, l, g, y, p, f, m), b = a?.serverIndex ?? 0, h = F["DefaultApi.getCryptoEMA"]?.[b]?.url;
    return (x, R) => Q(u, axios_default, D, a)(x, h || R);
  }, async getCryptoMACD(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b) {
    let h = await e.getCryptoMACD(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b), x = a?.serverIndex ?? 0, R = F["DefaultApi.getCryptoMACD"]?.[x]?.url;
    return (c, k) => Q(h, axios_default, D, a)(c, R || k);
  }, async getCryptoOpenClose(t, i, n, s, o) {
    let r = await e.getCryptoOpenClose(t, i, n, s, o), d = a?.serverIndex ?? 0, l = F["DefaultApi.getCryptoOpenClose"]?.[d]?.url;
    return (g, y) => Q(r, axios_default, D, a)(g, l || y);
  }, async getCryptoRSI(t, i, n, s, o, r, d, l, g, y, p, f, m) {
    let u = await e.getCryptoRSI(t, i, n, s, o, r, d, l, g, y, p, f, m), b = a?.serverIndex ?? 0, h = F["DefaultApi.getCryptoRSI"]?.[b]?.url;
    return (x, R) => Q(u, axios_default, D, a)(x, h || R);
  }, async getCryptoSMA(t, i, n, s, o, r, d, l, g, y, p, f, m) {
    let u = await e.getCryptoSMA(t, i, n, s, o, r, d, l, g, y, p, f, m), b = a?.serverIndex ?? 0, h = F["DefaultApi.getCryptoSMA"]?.[b]?.url;
    return (x, R) => Q(u, axios_default, D, a)(x, h || R);
  }, async getCryptoSnapshotDirection(t, i) {
    let n = await e.getCryptoSnapshotDirection(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getCryptoSnapshotDirection"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getCryptoSnapshotTicker(t, i) {
    let n = await e.getCryptoSnapshotTicker(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getCryptoSnapshotTicker"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getCryptoSnapshotTickers(t, i) {
    let n = await e.getCryptoSnapshotTickers(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getCryptoSnapshotTickers"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getCryptoTrades(t, i, n, s, o, r, d, l, g, y) {
    let p = await e.getCryptoTrades(t, i, n, s, o, r, d, l, g, y), f = a?.serverIndex ?? 0, m = F["DefaultApi.getCryptoTrades"]?.[f]?.url;
    return (u, b) => Q(p, axios_default, D, a)(u, m || b);
  }, async getCryptoV1Exchanges(t, i) {
    let n = await e.getCryptoV1Exchanges(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getCryptoV1Exchanges"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getCurrencyConversion(t, i, n, s, o) {
    let r = await e.getCurrencyConversion(t, i, n, s, o), d = a?.serverIndex ?? 0, l = F["DefaultApi.getCurrencyConversion"]?.[d]?.url;
    return (g, y) => Q(r, axios_default, D, a)(g, l || y);
  }, async getEtfGlobalV1Analytics(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _, me, he, xe, Re, P, Ae, ne, Ge, Oe, Ce, Ve, Se, we, ve, Te) {
    let Ie = await e.getEtfGlobalV1Analytics(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _, me, he, xe, Re, P, Ae, ne, Ge, Oe, Ce, Ve, Se, we, ve, Te), ke = a?.serverIndex ?? 0, Le = F["DefaultApi.getEtfGlobalV1Analytics"]?.[ke]?.url;
    return (De, q) => Q(Ie, axios_default, D, a)(De, Le || q);
  }, async getEtfGlobalV1Constituents(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X) {
    let J = await e.getEtfGlobalV1Constituents(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X), ye = a?.serverIndex ?? 0, ge = F["DefaultApi.getEtfGlobalV1Constituents"]?.[ye]?.url;
    return (be, Z) => Q(J, axios_default, D, a)(be, ge || Z);
  }, async getEtfGlobalV1FundFlows(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c) {
    let k = await e.getEtfGlobalV1FundFlows(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c), A = a?.serverIndex ?? 0, G = F["DefaultApi.getEtfGlobalV1FundFlows"]?.[A]?.url;
    return (S, C) => Q(k, axios_default, D, a)(S, G || C);
  }, async getEtfGlobalV1Profiles(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c) {
    let k = await e.getEtfGlobalV1Profiles(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c), A = a?.serverIndex ?? 0, G = F["DefaultApi.getEtfGlobalV1Profiles"]?.[A]?.url;
    return (S, C) => Q(k, axios_default, D, a)(S, G || C);
  }, async getEtfGlobalV1Taxonomies(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c) {
    let k = await e.getEtfGlobalV1Taxonomies(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c), A = a?.serverIndex ?? 0, G = F["DefaultApi.getEtfGlobalV1Taxonomies"]?.[A]?.url;
    return (S, C) => Q(k, axios_default, D, a)(S, G || C);
  }, async getEvents(t, i, n) {
    let s = await e.getEvents(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getEvents"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getFedV1Inflation(t, i, n, s, o, r, d, l, g) {
    let y = await e.getFedV1Inflation(t, i, n, s, o, r, d, l, g), p = a?.serverIndex ?? 0, f = F["DefaultApi.getFedV1Inflation"]?.[p]?.url;
    return (m, u) => Q(y, axios_default, D, a)(m, f || u);
  }, async getFedV1InflationExpectations(t, i, n, s, o, r, d, l, g) {
    let y = await e.getFedV1InflationExpectations(t, i, n, s, o, r, d, l, g), p = a?.serverIndex ?? 0, f = F["DefaultApi.getFedV1InflationExpectations"]?.[p]?.url;
    return (m, u) => Q(y, axios_default, D, a)(m, f || u);
  }, async getFedV1LaborMarket(t, i, n, s, o, r, d, l, g) {
    let y = await e.getFedV1LaborMarket(t, i, n, s, o, r, d, l, g), p = a?.serverIndex ?? 0, f = F["DefaultApi.getFedV1LaborMarket"]?.[p]?.url;
    return (m, u) => Q(y, axios_default, D, a)(m, f || u);
  }, async getFedV1TreasuryYields(t, i, n, s, o, r, d, l, g) {
    let y = await e.getFedV1TreasuryYields(t, i, n, s, o, r, d, l, g), p = a?.serverIndex ?? 0, f = F["DefaultApi.getFedV1TreasuryYields"]?.[p]?.url;
    return (m, u) => Q(y, axios_default, D, a)(m, f || u);
  }, async getForexAggregates(t, i, n, s, o, r, d, l, g) {
    let y = await e.getForexAggregates(t, i, n, s, o, r, d, l, g), p = a?.serverIndex ?? 0, f = F["DefaultApi.getForexAggregates"]?.[p]?.url;
    return (m, u) => Q(y, axios_default, D, a)(m, f || u);
  }, async getForexEMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getForexEMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getForexEMA"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getForexMACD(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h) {
    let x = await e.getForexMACD(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h), R = a?.serverIndex ?? 0, c = F["DefaultApi.getForexMACD"]?.[R]?.url;
    return (k, A) => Q(x, axios_default, D, a)(k, c || A);
  }, async getForexQuotes(t, i, n, s, o, r, d, l, g, y) {
    let p = await e.getForexQuotes(t, i, n, s, o, r, d, l, g, y), f = a?.serverIndex ?? 0, m = F["DefaultApi.getForexQuotes"]?.[f]?.url;
    return (u, b) => Q(p, axios_default, D, a)(u, m || b);
  }, async getForexRSI(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getForexRSI(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getForexRSI"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getForexSMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getForexSMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getForexSMA"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getForexSnapshotDirection(t, i) {
    let n = await e.getForexSnapshotDirection(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getForexSnapshotDirection"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getForexSnapshotTicker(t, i) {
    let n = await e.getForexSnapshotTicker(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getForexSnapshotTicker"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getForexSnapshotTickers(t, i) {
    let n = await e.getForexSnapshotTickers(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getForexSnapshotTickers"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getForexV1Exchanges(t, i) {
    let n = await e.getForexV1Exchanges(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getForexV1Exchanges"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getFuturesAggregates(t, i, n, s, o, r, d, l, g, y) {
    let p = await e.getFuturesAggregates(t, i, n, s, o, r, d, l, g, y), f = a?.serverIndex ?? 0, m = F["DefaultApi.getFuturesAggregates"]?.[f]?.url;
    return (u, b) => Q(p, axios_default, D, a)(u, m || b);
  }, async getFuturesQuotes(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getFuturesQuotes(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getFuturesQuotes"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getFuturesTrades(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getFuturesTrades(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getFuturesTrades"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getFuturesVXContracts(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v) {
    let te = await e.getFuturesVXContracts(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v), ee = a?.serverIndex ?? 0, se = F["DefaultApi.getFuturesVXContracts"]?.[ee]?.url;
    return (ie, $) => Q(te, axios_default, D, a)(ie, se || $);
  }, async getFuturesVXExchanges(t, i) {
    let n = await e.getFuturesVXExchanges(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getFuturesVXExchanges"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getFuturesVXMarketStatus(t, i, n, s, o, r, d, l) {
    let g = await e.getFuturesVXMarketStatus(t, i, n, s, o, r, d, l), y = a?.serverIndex ?? 0, p = F["DefaultApi.getFuturesVXMarketStatus"]?.[y]?.url;
    return (f, m) => Q(g, axios_default, D, a)(f, p || m);
  }, async getFuturesVXProducts(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se) {
    let ie = await e.getFuturesVXProducts(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se), $ = a?.serverIndex ?? 0, oe = F["DefaultApi.getFuturesVXProducts"]?.[$]?.url;
    return (re, L) => Q(ie, axios_default, D, a)(re, oe || L);
  }, async getFuturesVXSchedules(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A) {
    let G = await e.getFuturesVXSchedules(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A), S = a?.serverIndex ?? 0, C = F["DefaultApi.getFuturesVXSchedules"]?.[S]?.url;
    return (w, O) => Q(G, axios_default, D, a)(w, C || O);
  }, async getFuturesVXSnapshot(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b) {
    let h = await e.getFuturesVXSnapshot(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b), x = a?.serverIndex ?? 0, R = F["DefaultApi.getFuturesVXSnapshot"]?.[x]?.url;
    return (c, k) => Q(h, axios_default, D, a)(c, R || k);
  }, async getGroupedCryptoAggregates(t, i, n) {
    let s = await e.getGroupedCryptoAggregates(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getGroupedCryptoAggregates"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getGroupedForexAggregates(t, i, n) {
    let s = await e.getGroupedForexAggregates(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getGroupedForexAggregates"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getGroupedStocksAggregates(t, i, n, s) {
    let o = await e.getGroupedStocksAggregates(t, i, n, s), r = a?.serverIndex ?? 0, d = F["DefaultApi.getGroupedStocksAggregates"]?.[r]?.url;
    return (l, g) => Q(o, axios_default, D, a)(l, d || g);
  }, async getIndicesAggregates(t, i, n, s, o, r, d, l) {
    let g = await e.getIndicesAggregates(t, i, n, s, o, r, d, l), y = a?.serverIndex ?? 0, p = F["DefaultApi.getIndicesAggregates"]?.[y]?.url;
    return (f, m) => Q(g, axios_default, D, a)(f, p || m);
  }, async getIndicesEMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getIndicesEMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getIndicesEMA"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getIndicesMACD(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h) {
    let x = await e.getIndicesMACD(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h), R = a?.serverIndex ?? 0, c = F["DefaultApi.getIndicesMACD"]?.[R]?.url;
    return (k, A) => Q(x, axios_default, D, a)(k, c || A);
  }, async getIndicesOpenClose(t, i, n) {
    let s = await e.getIndicesOpenClose(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getIndicesOpenClose"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getIndicesRSI(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getIndicesRSI(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getIndicesRSI"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getIndicesSMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getIndicesSMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getIndicesSMA"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getIndicesSnapshot(t, i, n, s, o, r, d, l, g, y) {
    let p = await e.getIndicesSnapshot(t, i, n, s, o, r, d, l, g, y), f = a?.serverIndex ?? 0, m = F["DefaultApi.getIndicesSnapshot"]?.[f]?.url;
    return (u, b) => Q(p, axios_default, D, a)(u, m || b);
  }, async getLastCryptoTrade(t, i, n) {
    let s = await e.getLastCryptoTrade(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getLastCryptoTrade"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getLastCurrencyQuote(t, i, n) {
    let s = await e.getLastCurrencyQuote(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getLastCurrencyQuote"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getLastOptionsTrade(t, i) {
    let n = await e.getLastOptionsTrade(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getLastOptionsTrade"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getLastStocksQuote(t, i) {
    let n = await e.getLastStocksQuote(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getLastStocksQuote"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getLastStocksTrade(t, i) {
    let n = await e.getLastStocksTrade(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getLastStocksTrade"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getMarketHolidays(t) {
    let i = await e.getMarketHolidays(t), n = a?.serverIndex ?? 0, s = F["DefaultApi.getMarketHolidays"]?.[n]?.url;
    return (o, r) => Q(i, axios_default, D, a)(o, s || r);
  }, async getMarketStatus(t) {
    let i = await e.getMarketStatus(t), n = a?.serverIndex ?? 0, s = F["DefaultApi.getMarketStatus"]?.[n]?.url;
    return (o, r) => Q(i, axios_default, D, a)(o, s || r);
  }, async getOptionContract(t, i, n) {
    let s = await e.getOptionContract(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getOptionContract"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getOptionsAggregates(t, i, n, s, o, r, d, l, g) {
    let y = await e.getOptionsAggregates(t, i, n, s, o, r, d, l, g), p = a?.serverIndex ?? 0, f = F["DefaultApi.getOptionsAggregates"]?.[p]?.url;
    return (m, u) => Q(y, axios_default, D, a)(m, f || u);
  }, async getOptionsChain(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h) {
    let x = await e.getOptionsChain(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h), R = a?.serverIndex ?? 0, c = F["DefaultApi.getOptionsChain"]?.[R]?.url;
    return (k, A) => Q(x, axios_default, D, a)(k, c || A);
  }, async getOptionsContract(t, i, n) {
    let s = await e.getOptionsContract(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getOptionsContract"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getOptionsEMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getOptionsEMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getOptionsEMA"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getOptionsMACD(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h) {
    let x = await e.getOptionsMACD(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h), R = a?.serverIndex ?? 0, c = F["DefaultApi.getOptionsMACD"]?.[R]?.url;
    return (k, A) => Q(x, axios_default, D, a)(k, c || A);
  }, async getOptionsOpenClose(t, i, n, s) {
    let o = await e.getOptionsOpenClose(t, i, n, s), r = a?.serverIndex ?? 0, d = F["DefaultApi.getOptionsOpenClose"]?.[r]?.url;
    return (l, g) => Q(o, axios_default, D, a)(l, d || g);
  }, async getOptionsQuotes(t, i, n, s, o, r, d, l, g, y) {
    let p = await e.getOptionsQuotes(t, i, n, s, o, r, d, l, g, y), f = a?.serverIndex ?? 0, m = F["DefaultApi.getOptionsQuotes"]?.[f]?.url;
    return (u, b) => Q(p, axios_default, D, a)(u, m || b);
  }, async getOptionsRSI(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getOptionsRSI(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getOptionsRSI"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getOptionsSMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getOptionsSMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getOptionsSMA"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getOptionsTrades(t, i, n, s, o, r, d, l, g, y) {
    let p = await e.getOptionsTrades(t, i, n, s, o, r, d, l, g, y), f = a?.serverIndex ?? 0, m = F["DefaultApi.getOptionsTrades"]?.[f]?.url;
    return (u, b) => Q(p, axios_default, D, a)(u, m || b);
  }, async getOptionsV1Exchanges(t, i) {
    let n = await e.getOptionsV1Exchanges(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getOptionsV1Exchanges"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getPreviousCryptoAggregates(t, i, n) {
    let s = await e.getPreviousCryptoAggregates(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getPreviousCryptoAggregates"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getPreviousForexAggregates(t, i, n) {
    let s = await e.getPreviousForexAggregates(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getPreviousForexAggregates"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getPreviousIndicesAggregates(t, i) {
    let n = await e.getPreviousIndicesAggregates(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getPreviousIndicesAggregates"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getPreviousOptionsAggregates(t, i, n) {
    let s = await e.getPreviousOptionsAggregates(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getPreviousOptionsAggregates"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getPreviousStocksAggregates(t, i, n) {
    let s = await e.getPreviousStocksAggregates(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getPreviousStocksAggregates"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getRelatedCompanies(t, i) {
    let n = await e.getRelatedCompanies(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getRelatedCompanies"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getSnapshotSummary(t, i) {
    let n = await e.getSnapshotSummary(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getSnapshotSummary"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getSnapshots(t, i, n, s, o, r, d, l, g, y, p) {
    let f = await e.getSnapshots(t, i, n, s, o, r, d, l, g, y, p), m = a?.serverIndex ?? 0, u = F["DefaultApi.getSnapshots"]?.[m]?.url;
    return (b, h) => Q(f, axios_default, D, a)(b, u || h);
  }, async getStocksAggregates(t, i, n, s, o, r, d, l, g) {
    let y = await e.getStocksAggregates(t, i, n, s, o, r, d, l, g), p = a?.serverIndex ?? 0, f = F["DefaultApi.getStocksAggregates"]?.[p]?.url;
    return (m, u) => Q(y, axios_default, D, a)(m, f || u);
  }, async getStocksEMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getStocksEMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getStocksEMA"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getStocksFilings10KVXSections(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N) {
    let T = await e.getStocksFilings10KVXSections(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N), K = a?.serverIndex ?? 0, W = F["DefaultApi.getStocksFilings10KVXSections"]?.[K]?.url;
    return (I, V) => Q(T, axios_default, D, a)(I, W || V);
  }, async getStocksFilingsVXRiskFactors(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A) {
    let G = await e.getStocksFilingsVXRiskFactors(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A), S = a?.serverIndex ?? 0, C = F["DefaultApi.getStocksFilingsVXRiskFactors"]?.[S]?.url;
    return (w, O) => Q(G, axios_default, D, a)(w, C || O);
  }, async getStocksFinancialsV1BalanceSheets(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J) {
    let ye = await e.getStocksFinancialsV1BalanceSheets(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J), ge = a?.serverIndex ?? 0, be = F["DefaultApi.getStocksFinancialsV1BalanceSheets"]?.[ge]?.url;
    return (Z, _) => Q(ye, axios_default, D, a)(Z, be || _);
  }, async getStocksFinancialsV1CashFlowStatements(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J) {
    let ye = await e.getStocksFinancialsV1CashFlowStatements(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J), ge = a?.serverIndex ?? 0, be = F["DefaultApi.getStocksFinancialsV1CashFlowStatements"]?.[ge]?.url;
    return (Z, _) => Q(ye, axios_default, D, a)(Z, be || _);
  }, async getStocksFinancialsV1IncomeStatements(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J) {
    let ye = await e.getStocksFinancialsV1IncomeStatements(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J), ge = a?.serverIndex ?? 0, be = F["DefaultApi.getStocksFinancialsV1IncomeStatements"]?.[ge]?.url;
    return (Z, _) => Q(ye, axios_default, D, a)(Z, be || _);
  }, async getStocksFinancialsV1Ratios(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _, me, he, xe, Re, P, Ae, ne, Ge, Oe, Ce, Ve, Se, we, ve, Te, Ie, ke, Le, De, q, Be, Ue, ze, Ee, Qe, Me, He, je, Ke, Ne, $e, Ye, We, Xe, Je, Ze, qe, Pe, en, nn, tn, sn, on, rn, an, dn, ln, gn, cn, pn, fn, un, yn, bn, mn, hn, Rn, xn, An, Sn) {
    let kn = await e.getStocksFinancialsV1Ratios(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J, ye, ge, be, Z, _, me, he, xe, Re, P, Ae, ne, Ge, Oe, Ce, Ve, Se, we, ve, Te, Ie, ke, Le, De, q, Be, Ue, ze, Ee, Qe, Me, He, je, Ke, Ne, $e, Ye, We, Xe, Je, Ze, qe, Pe, en, nn, tn, sn, on, rn, an, dn, ln, gn, cn, pn, fn, un, yn, bn, mn, hn, Rn, xn, An, Sn), Fe = a?.serverIndex ?? 0, _n = F["DefaultApi.getStocksFinancialsV1Ratios"]?.[Fe]?.url;
    return (wn, j) => Q(kn, axios_default, D, a)(wn, _n || j);
  }, async getStocksMACD(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h) {
    let x = await e.getStocksMACD(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h), R = a?.serverIndex ?? 0, c = F["DefaultApi.getStocksMACD"]?.[R]?.url;
    return (k, A) => Q(x, axios_default, D, a)(k, c || A);
  }, async getStocksOpenClose(t, i, n, s) {
    let o = await e.getStocksOpenClose(t, i, n, s), r = a?.serverIndex ?? 0, d = F["DefaultApi.getStocksOpenClose"]?.[r]?.url;
    return (l, g) => Q(o, axios_default, D, a)(l, d || g);
  }, async getStocksQuotes(t, i, n, s, o, r, d, l, g, y) {
    let p = await e.getStocksQuotes(t, i, n, s, o, r, d, l, g, y), f = a?.serverIndex ?? 0, m = F["DefaultApi.getStocksQuotes"]?.[f]?.url;
    return (u, b) => Q(p, axios_default, D, a)(u, m || b);
  }, async getStocksRSI(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getStocksRSI(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getStocksRSI"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getStocksSMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getStocksSMA(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getStocksSMA"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getStocksSnapshotDirection(t, i, n) {
    let s = await e.getStocksSnapshotDirection(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getStocksSnapshotDirection"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getStocksSnapshotTicker(t, i) {
    let n = await e.getStocksSnapshotTicker(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getStocksSnapshotTicker"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getStocksSnapshotTickers(t, i, n) {
    let s = await e.getStocksSnapshotTickers(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getStocksSnapshotTickers"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getStocksTaxonomiesVXRiskFactors(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O) {
    let N = await e.getStocksTaxonomiesVXRiskFactors(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O), T = a?.serverIndex ?? 0, K = F["DefaultApi.getStocksTaxonomiesVXRiskFactors"]?.[T]?.url;
    return (W, I) => Q(N, axios_default, D, a)(W, K || I);
  }, async getStocksTrades(t, i, n, s, o, r, d, l, g, y) {
    let p = await e.getStocksTrades(t, i, n, s, o, r, d, l, g, y), f = a?.serverIndex ?? 0, m = F["DefaultApi.getStocksTrades"]?.[f]?.url;
    return (u, b) => Q(p, axios_default, D, a)(u, m || b);
  }, async getStocksV1Dividends(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A) {
    let G = await e.getStocksV1Dividends(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A), S = a?.serverIndex ?? 0, C = F["DefaultApi.getStocksV1Dividends"]?.[S]?.url;
    return (w, O) => Q(G, axios_default, D, a)(w, C || O);
  }, async getStocksV1Exchanges(t, i) {
    let n = await e.getStocksV1Exchanges(t, i), s = a?.serverIndex ?? 0, o = F["DefaultApi.getStocksV1Exchanges"]?.[s]?.url;
    return (r, d) => Q(n, axios_default, D, a)(r, o || d);
  }, async getStocksV1ShortInterest(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N) {
    let T = await e.getStocksV1ShortInterest(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N), K = a?.serverIndex ?? 0, W = F["DefaultApi.getStocksV1ShortInterest"]?.[K]?.url;
    return (I, V) => Q(T, axios_default, D, a)(I, W || V);
  }, async getStocksV1ShortVolume(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N) {
    let T = await e.getStocksV1ShortVolume(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N), K = a?.serverIndex ?? 0, W = F["DefaultApi.getStocksV1ShortVolume"]?.[K]?.url;
    return (I, V) => Q(T, axios_default, D, a)(I, W || V);
  }, async getStocksV1Splits(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h) {
    let x = await e.getStocksV1Splits(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h), R = a?.serverIndex ?? 0, c = F["DefaultApi.getStocksV1Splits"]?.[R]?.url;
    return (k, A) => Q(x, axios_default, D, a)(k, c || A);
  }, async getStocksVXFloat(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.getStocksVXFloat(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.getStocksVXFloat"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async getTicker(t, i, n) {
    let s = await e.getTicker(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.getTicker"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async getTmxV1CorporateEvents(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J) {
    let ye = await e.getTmxV1CorporateEvents(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se, ie, $, oe, re, L, ae, ce, pe, fe, de, le, ue, X, J), ge = a?.serverIndex ?? 0, be = F["DefaultApi.getTmxV1CorporateEvents"]?.[ge]?.url;
    return (Z, _) => Q(ye, axios_default, D, a)(Z, be || _);
  }, async listConditions(t, i, n, s, o, r, d, l) {
    let g = await e.listConditions(t, i, n, s, o, r, d, l), y = a?.serverIndex ?? 0, p = F["DefaultApi.listConditions"]?.[y]?.url;
    return (f, m) => Q(g, axios_default, D, a)(f, p || m);
  }, async listDividends(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se) {
    let ie = await e.listDividends(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S, C, w, O, N, T, K, W, I, V, v, te, ee, se), $ = a?.serverIndex ?? 0, oe = F["DefaultApi.listDividends"]?.[$]?.url;
    return (re, L) => Q(ie, axios_default, D, a)(re, oe || L);
  }, async listExchanges(t, i, n) {
    let s = await e.listExchanges(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.listExchanges"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async listFinancials(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A) {
    let G = await e.listFinancials(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A), S = a?.serverIndex ?? 0, C = F["DefaultApi.listFinancials"]?.[S]?.url;
    return (w, O) => Q(G, axios_default, D, a)(w, C || O);
  }, async listIPOs(t, i, n, s, o, r, d, l, g, y, p, f, m) {
    let u = await e.listIPOs(t, i, n, s, o, r, d, l, g, y, p, f, m), b = a?.serverIndex ?? 0, h = F["DefaultApi.listIPOs"]?.[b]?.url;
    return (x, R) => Q(u, axios_default, D, a)(x, h || R);
  }, async listNews(t, i, n, s, o, r, d, l, g, y, p, f, m, u) {
    let b = await e.listNews(t, i, n, s, o, r, d, l, g, y, p, f, m, u), h = a?.serverIndex ?? 0, x = F["DefaultApi.listNews"]?.[h]?.url;
    return (R, c) => Q(b, axios_default, D, a)(R, x || c);
  }, async listOptionsContracts(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S) {
    let C = await e.listOptionsContracts(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x, R, c, k, A, G, S), w = a?.serverIndex ?? 0, O = F["DefaultApi.listOptionsContracts"]?.[w]?.url;
    return (N, T) => Q(C, axios_default, D, a)(N, O || T);
  }, async listStockSplits(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b) {
    let h = await e.listStockSplits(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b), x = a?.serverIndex ?? 0, R = F["DefaultApi.listStockSplits"]?.[x]?.url;
    return (c, k) => Q(h, axios_default, D, a)(c, R || k);
  }, async listTickerTypes(t, i, n) {
    let s = await e.listTickerTypes(t, i, n), o = a?.serverIndex ?? 0, r = F["DefaultApi.listTickerTypes"]?.[o]?.url;
    return (d, l) => Q(s, axios_default, D, a)(d, r || l);
  }, async listTickers(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x) {
    let R = await e.listTickers(t, i, n, s, o, r, d, l, g, y, p, f, m, u, b, h, x), c = a?.serverIndex ?? 0, k = F["DefaultApi.listTickers"]?.[c]?.url;
    return (A, G) => Q(R, axios_default, D, a)(A, k || G);
  } };
};
var Cn = class extends Gn {
  deprecatedGetCryptoSnapshotTickerBook(e, t) {
    return M(this.configuration).deprecatedGetCryptoSnapshotTickerBook(e.ticker, t).then((i) => i(this.axios, this.basePath));
  }
  deprecatedGetHistoricCryptoTrades(e, t) {
    return M(this.configuration).deprecatedGetHistoricCryptoTrades(e.from, e.to, e.date, e.offset, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  deprecatedGetHistoricForexQuotes(e, t) {
    return M(this.configuration).deprecatedGetHistoricForexQuotes(e.from, e.to, e.date, e.offset, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  deprecatedGetHistoricStocksQuotes(e, t) {
    return M(this.configuration).deprecatedGetHistoricStocksQuotes(e.ticker, e.date, e.timestamp, e.timestampLimit, e.reverse, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  deprecatedGetHistoricStocksTrades(e, t) {
    return M(this.configuration).deprecatedGetHistoricStocksTrades(e.ticker, e.date, e.timestamp, e.timestampLimit, e.reverse, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getBenzingaV1AnalystInsights(e = {}, t) {
    return M(this.configuration).getBenzingaV1AnalystInsights(e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.lastUpdated, e.lastUpdatedGt, e.lastUpdatedGte, e.lastUpdatedLt, e.lastUpdatedLte, e.firm, e.firmAnyOf, e.firmGt, e.firmGte, e.firmLt, e.firmLte, e.ratingAction, e.ratingActionAnyOf, e.ratingActionGt, e.ratingActionGte, e.ratingActionLt, e.ratingActionLte, e.benzingaFirmId, e.benzingaFirmIdAnyOf, e.benzingaFirmIdGt, e.benzingaFirmIdGte, e.benzingaFirmIdLt, e.benzingaFirmIdLte, e.benzingaRatingId, e.benzingaRatingIdAnyOf, e.benzingaRatingIdGt, e.benzingaRatingIdGte, e.benzingaRatingIdLt, e.benzingaRatingIdLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getBenzingaV1Analysts(e = {}, t) {
    return M(this.configuration).getBenzingaV1Analysts(e.benzingaId, e.benzingaIdAnyOf, e.benzingaIdGt, e.benzingaIdGte, e.benzingaIdLt, e.benzingaIdLte, e.benzingaFirmId, e.benzingaFirmIdAnyOf, e.benzingaFirmIdGt, e.benzingaFirmIdGte, e.benzingaFirmIdLt, e.benzingaFirmIdLte, e.firmName, e.firmNameAnyOf, e.firmNameGt, e.firmNameGte, e.firmNameLt, e.firmNameLte, e.fullName, e.fullNameAnyOf, e.fullNameGt, e.fullNameGte, e.fullNameLt, e.fullNameLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getBenzingaV1BullsBearsSay(e = {}, t) {
    return M(this.configuration).getBenzingaV1BullsBearsSay(e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.benzingaId, e.benzingaIdAnyOf, e.benzingaIdGt, e.benzingaIdGte, e.benzingaIdLt, e.benzingaIdLte, e.lastUpdated, e.lastUpdatedGt, e.lastUpdatedGte, e.lastUpdatedLt, e.lastUpdatedLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getBenzingaV1ConsensusRatings(e, t) {
    return M(this.configuration).getBenzingaV1ConsensusRatings(e.ticker, e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getBenzingaV1Earnings(e = {}, t) {
    return M(this.configuration).getBenzingaV1Earnings(e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.importance, e.importanceAnyOf, e.importanceGt, e.importanceGte, e.importanceLt, e.importanceLte, e.lastUpdated, e.lastUpdatedAnyOf, e.lastUpdatedGt, e.lastUpdatedGte, e.lastUpdatedLt, e.lastUpdatedLte, e.dateStatus, e.dateStatusAnyOf, e.dateStatusGt, e.dateStatusGte, e.dateStatusLt, e.dateStatusLte, e.epsSurprisePercent, e.epsSurprisePercentAnyOf, e.epsSurprisePercentGt, e.epsSurprisePercentGte, e.epsSurprisePercentLt, e.epsSurprisePercentLte, e.revenueSurprisePercent, e.revenueSurprisePercentAnyOf, e.revenueSurprisePercentGt, e.revenueSurprisePercentGte, e.revenueSurprisePercentLt, e.revenueSurprisePercentLte, e.fiscalYear, e.fiscalYearAnyOf, e.fiscalYearGt, e.fiscalYearGte, e.fiscalYearLt, e.fiscalYearLte, e.fiscalPeriod, e.fiscalPeriodAnyOf, e.fiscalPeriodGt, e.fiscalPeriodGte, e.fiscalPeriodLt, e.fiscalPeriodLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getBenzingaV1Firms(e = {}, t) {
    return M(this.configuration).getBenzingaV1Firms(e.benzingaId, e.benzingaIdAnyOf, e.benzingaIdGt, e.benzingaIdGte, e.benzingaIdLt, e.benzingaIdLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getBenzingaV1Guidance(e = {}, t) {
    return M(this.configuration).getBenzingaV1Guidance(e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.positioning, e.positioningAnyOf, e.positioningGt, e.positioningGte, e.positioningLt, e.positioningLte, e.importance, e.importanceAnyOf, e.importanceGt, e.importanceGte, e.importanceLt, e.importanceLte, e.lastUpdated, e.lastUpdatedAnyOf, e.lastUpdatedGt, e.lastUpdatedGte, e.lastUpdatedLt, e.lastUpdatedLte, e.fiscalYear, e.fiscalYearAnyOf, e.fiscalYearGt, e.fiscalYearGte, e.fiscalYearLt, e.fiscalYearLte, e.fiscalPeriod, e.fiscalPeriodAnyOf, e.fiscalPeriodGt, e.fiscalPeriodGte, e.fiscalPeriodLt, e.fiscalPeriodLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getBenzingaV1Ratings(e = {}, t) {
    return M(this.configuration).getBenzingaV1Ratings(e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.importance, e.importanceGt, e.importanceGte, e.importanceLt, e.importanceLte, e.lastUpdated, e.lastUpdatedGt, e.lastUpdatedGte, e.lastUpdatedLt, e.lastUpdatedLte, e.ratingAction, e.ratingActionAnyOf, e.ratingActionGt, e.ratingActionGte, e.ratingActionLt, e.ratingActionLte, e.priceTargetAction, e.priceTargetActionAnyOf, e.priceTargetActionGt, e.priceTargetActionGte, e.priceTargetActionLt, e.priceTargetActionLte, e.benzingaId, e.benzingaIdAnyOf, e.benzingaIdGt, e.benzingaIdGte, e.benzingaIdLt, e.benzingaIdLte, e.benzingaAnalystId, e.benzingaAnalystIdAnyOf, e.benzingaAnalystIdGt, e.benzingaAnalystIdGte, e.benzingaAnalystIdLt, e.benzingaAnalystIdLte, e.benzingaFirmId, e.benzingaFirmIdAnyOf, e.benzingaFirmIdGt, e.benzingaFirmIdGte, e.benzingaFirmIdLt, e.benzingaFirmIdLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getBenzingaV2News(e = {}, t) {
    return M(this.configuration).getBenzingaV2News(e.published, e.publishedGt, e.publishedGte, e.publishedLt, e.publishedLte, e.channels, e.channelsAllOf, e.channelsAnyOf, e.tags, e.tagsAllOf, e.tagsAnyOf, e.author, e.authorAnyOf, e.authorGt, e.authorGte, e.authorLt, e.authorLte, e.stocks, e.stocksAllOf, e.stocksAnyOf, e.tickers, e.tickersAllOf, e.tickersAnyOf, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoAggregates(e, t) {
    return M(this.configuration).getCryptoAggregates(e.cryptoTicker, e.multiplier, e.timespan, e.from, e.to, e.adjusted, e.sort, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoEMA(e, t) {
    return M(this.configuration).getCryptoEMA(e.cryptoTicker, e.timestamp, e.timespan, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoMACD(e, t) {
    return M(this.configuration).getCryptoMACD(e.cryptoTicker, e.timestamp, e.timespan, e.shortWindow, e.longWindow, e.signalWindow, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoOpenClose(e, t) {
    return M(this.configuration).getCryptoOpenClose(e.from, e.to, e.date, e.adjusted, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoRSI(e, t) {
    return M(this.configuration).getCryptoRSI(e.cryptoTicker, e.timestamp, e.timespan, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoSMA(e, t) {
    return M(this.configuration).getCryptoSMA(e.cryptoTicker, e.timestamp, e.timespan, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoSnapshotDirection(e, t) {
    return M(this.configuration).getCryptoSnapshotDirection(e.direction, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoSnapshotTicker(e, t) {
    return M(this.configuration).getCryptoSnapshotTicker(e.ticker, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoSnapshotTickers(e = {}, t) {
    return M(this.configuration).getCryptoSnapshotTickers(e.tickers, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoTrades(e, t) {
    return M(this.configuration).getCryptoTrades(e.cryptoTicker, e.timestamp, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getCryptoV1Exchanges(e = {}, t) {
    return M(this.configuration).getCryptoV1Exchanges(e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getCurrencyConversion(e, t) {
    return M(this.configuration).getCurrencyConversion(e.from, e.to, e.amount, e.precision, t).then((i) => i(this.axios, this.basePath));
  }
  getEtfGlobalV1Analytics(e = {}, t) {
    return M(this.configuration).getEtfGlobalV1Analytics(e.compositeTicker, e.compositeTickerAnyOf, e.compositeTickerGt, e.compositeTickerGte, e.compositeTickerLt, e.compositeTickerLte, e.processedDate, e.processedDateGt, e.processedDateGte, e.processedDateLt, e.processedDateLte, e.effectiveDate, e.effectiveDateGt, e.effectiveDateGte, e.effectiveDateLt, e.effectiveDateLte, e.riskTotalScore, e.riskTotalScoreGt, e.riskTotalScoreGte, e.riskTotalScoreLt, e.riskTotalScoreLte, e.rewardScore, e.rewardScoreGt, e.rewardScoreGte, e.rewardScoreLt, e.rewardScoreLte, e.quantTotalScore, e.quantTotalScoreGt, e.quantTotalScoreGte, e.quantTotalScoreLt, e.quantTotalScoreLte, e.quantGrade, e.quantGradeAnyOf, e.quantGradeGt, e.quantGradeGte, e.quantGradeLt, e.quantGradeLte, e.quantCompositeTechnical, e.quantCompositeTechnicalGt, e.quantCompositeTechnicalGte, e.quantCompositeTechnicalLt, e.quantCompositeTechnicalLte, e.quantCompositeSentiment, e.quantCompositeSentimentGt, e.quantCompositeSentimentGte, e.quantCompositeSentimentLt, e.quantCompositeSentimentLte, e.quantCompositeBehavioral, e.quantCompositeBehavioralGt, e.quantCompositeBehavioralGte, e.quantCompositeBehavioralLt, e.quantCompositeBehavioralLte, e.quantCompositeFundamental, e.quantCompositeFundamentalGt, e.quantCompositeFundamentalGte, e.quantCompositeFundamentalLt, e.quantCompositeFundamentalLte, e.quantCompositeGlobal, e.quantCompositeGlobalGt, e.quantCompositeGlobalGte, e.quantCompositeGlobalLt, e.quantCompositeGlobalLte, e.quantCompositeQuality, e.quantCompositeQualityGt, e.quantCompositeQualityGte, e.quantCompositeQualityLt, e.quantCompositeQualityLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getEtfGlobalV1Constituents(e = {}, t) {
    return M(this.configuration).getEtfGlobalV1Constituents(e.compositeTicker, e.compositeTickerAnyOf, e.compositeTickerGt, e.compositeTickerGte, e.compositeTickerLt, e.compositeTickerLte, e.constituentTicker, e.constituentTickerAnyOf, e.constituentTickerGt, e.constituentTickerGte, e.constituentTickerLt, e.constituentTickerLte, e.effectiveDate, e.effectiveDateGt, e.effectiveDateGte, e.effectiveDateLt, e.effectiveDateLte, e.processedDate, e.processedDateGt, e.processedDateGte, e.processedDateLt, e.processedDateLte, e.usCode, e.usCodeAnyOf, e.usCodeGt, e.usCodeGte, e.usCodeLt, e.usCodeLte, e.isin, e.isinAnyOf, e.isinGt, e.isinGte, e.isinLt, e.isinLte, e.figi, e.figiAnyOf, e.figiGt, e.figiGte, e.figiLt, e.figiLte, e.sedol, e.sedolAnyOf, e.sedolGt, e.sedolGte, e.sedolLt, e.sedolLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getEtfGlobalV1FundFlows(e = {}, t) {
    return M(this.configuration).getEtfGlobalV1FundFlows(e.processedDate, e.processedDateGt, e.processedDateGte, e.processedDateLt, e.processedDateLte, e.effectiveDate, e.effectiveDateGt, e.effectiveDateGte, e.effectiveDateLt, e.effectiveDateLte, e.compositeTicker, e.compositeTickerAnyOf, e.compositeTickerGt, e.compositeTickerGte, e.compositeTickerLt, e.compositeTickerLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getEtfGlobalV1Profiles(e = {}, t) {
    return M(this.configuration).getEtfGlobalV1Profiles(e.processedDate, e.processedDateGt, e.processedDateGte, e.processedDateLt, e.processedDateLte, e.effectiveDate, e.effectiveDateGt, e.effectiveDateGte, e.effectiveDateLt, e.effectiveDateLte, e.compositeTicker, e.compositeTickerAnyOf, e.compositeTickerGt, e.compositeTickerGte, e.compositeTickerLt, e.compositeTickerLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getEtfGlobalV1Taxonomies(e = {}, t) {
    return M(this.configuration).getEtfGlobalV1Taxonomies(e.processedDate, e.processedDateGt, e.processedDateGte, e.processedDateLt, e.processedDateLte, e.effectiveDate, e.effectiveDateGt, e.effectiveDateGte, e.effectiveDateLt, e.effectiveDateLte, e.compositeTicker, e.compositeTickerAnyOf, e.compositeTickerGt, e.compositeTickerGte, e.compositeTickerLt, e.compositeTickerLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getEvents(e, t) {
    return M(this.configuration).getEvents(e.id, e.types, t).then((i) => i(this.axios, this.basePath));
  }
  getFedV1Inflation(e = {}, t) {
    return M(this.configuration).getFedV1Inflation(e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getFedV1InflationExpectations(e = {}, t) {
    return M(this.configuration).getFedV1InflationExpectations(e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getFedV1LaborMarket(e = {}, t) {
    return M(this.configuration).getFedV1LaborMarket(e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getFedV1TreasuryYields(e = {}, t) {
    return M(this.configuration).getFedV1TreasuryYields(e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getForexAggregates(e, t) {
    return M(this.configuration).getForexAggregates(e.forexTicker, e.multiplier, e.timespan, e.from, e.to, e.adjusted, e.sort, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getForexEMA(e, t) {
    return M(this.configuration).getForexEMA(e.fxTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getForexMACD(e, t) {
    return M(this.configuration).getForexMACD(e.fxTicker, e.timestamp, e.timespan, e.adjusted, e.shortWindow, e.longWindow, e.signalWindow, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getForexQuotes(e, t) {
    return M(this.configuration).getForexQuotes(e.fxTicker, e.timestamp, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getForexRSI(e, t) {
    return M(this.configuration).getForexRSI(e.fxTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getForexSMA(e, t) {
    return M(this.configuration).getForexSMA(e.fxTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getForexSnapshotDirection(e, t) {
    return M(this.configuration).getForexSnapshotDirection(e.direction, t).then((i) => i(this.axios, this.basePath));
  }
  getForexSnapshotTicker(e, t) {
    return M(this.configuration).getForexSnapshotTicker(e.ticker, t).then((i) => i(this.axios, this.basePath));
  }
  getForexSnapshotTickers(e = {}, t) {
    return M(this.configuration).getForexSnapshotTickers(e.tickers, t).then((i) => i(this.axios, this.basePath));
  }
  getForexV1Exchanges(e = {}, t) {
    return M(this.configuration).getForexV1Exchanges(e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getFuturesAggregates(e, t) {
    return M(this.configuration).getFuturesAggregates(e.ticker, e.resolution, e.windowStart, e.limit, e.windowStartGte, e.windowStartGt, e.windowStartLte, e.windowStartLt, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getFuturesQuotes(e, t) {
    return M(this.configuration).getFuturesQuotes(e.ticker, e.timestamp, e.sessionEndDate, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, e.sessionEndDateGte, e.sessionEndDateGt, e.sessionEndDateLte, e.sessionEndDateLt, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getFuturesTrades(e, t) {
    return M(this.configuration).getFuturesTrades(e.ticker, e.timestamp, e.sessionEndDate, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, e.sessionEndDateGte, e.sessionEndDateGt, e.sessionEndDateLte, e.sessionEndDateLt, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getFuturesVXContracts(e = {}, t) {
    return M(this.configuration).getFuturesVXContracts(e.date, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.productCode, e.productCodeAnyOf, e.productCodeGt, e.productCodeGte, e.productCodeLt, e.productCodeLte, e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.active, e.type, e.typeAnyOf, e.firstTradeDate, e.firstTradeDateGt, e.firstTradeDateGte, e.firstTradeDateLt, e.firstTradeDateLte, e.lastTradeDate, e.lastTradeDateGt, e.lastTradeDateGte, e.lastTradeDateLt, e.lastTradeDateLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getFuturesVXExchanges(e = {}, t) {
    return M(this.configuration).getFuturesVXExchanges(e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getFuturesVXMarketStatus(e = {}, t) {
    return M(this.configuration).getFuturesVXMarketStatus(e.productCode, e.productCodeAnyOf, e.productCodeGt, e.productCodeGte, e.productCodeLt, e.productCodeLte, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getFuturesVXProducts(e = {}, t) {
    return M(this.configuration).getFuturesVXProducts(e.name, e.nameAnyOf, e.nameGt, e.nameGte, e.nameLt, e.nameLte, e.productCode, e.productCodeAnyOf, e.productCodeGt, e.productCodeGte, e.productCodeLt, e.productCodeLte, e.date, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.tradingVenue, e.tradingVenueAnyOf, e.tradingVenueGt, e.tradingVenueGte, e.tradingVenueLt, e.tradingVenueLte, e.sector, e.sectorAnyOf, e.subSector, e.subSectorAnyOf, e.assetClass, e.assetClassAnyOf, e.assetSubClass, e.assetSubClassAnyOf, e.type, e.typeAnyOf, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getFuturesVXSchedules(e = {}, t) {
    return M(this.configuration).getFuturesVXSchedules(e.productCode, e.productCodeAnyOf, e.productCodeGt, e.productCodeGte, e.productCodeLt, e.productCodeLte, e.sessionEndDate, e.sessionEndDateAnyOf, e.sessionEndDateGt, e.sessionEndDateGte, e.sessionEndDateLt, e.sessionEndDateLte, e.tradingVenue, e.tradingVenueAnyOf, e.tradingVenueGt, e.tradingVenueGte, e.tradingVenueLt, e.tradingVenueLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getFuturesVXSnapshot(e = {}, t) {
    return M(this.configuration).getFuturesVXSnapshot(e.productCode, e.productCodeAnyOf, e.productCodeGt, e.productCodeGte, e.productCodeLt, e.productCodeLte, e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getGroupedCryptoAggregates(e, t) {
    return M(this.configuration).getGroupedCryptoAggregates(e.date, e.adjusted, t).then((i) => i(this.axios, this.basePath));
  }
  getGroupedForexAggregates(e, t) {
    return M(this.configuration).getGroupedForexAggregates(e.date, e.adjusted, t).then((i) => i(this.axios, this.basePath));
  }
  getGroupedStocksAggregates(e, t) {
    return M(this.configuration).getGroupedStocksAggregates(e.date, e.adjusted, e.includeOtc, t).then((i) => i(this.axios, this.basePath));
  }
  getIndicesAggregates(e, t) {
    return M(this.configuration).getIndicesAggregates(e.indicesTicker, e.multiplier, e.timespan, e.from, e.to, e.sort, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getIndicesEMA(e, t) {
    return M(this.configuration).getIndicesEMA(e.indicesTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getIndicesMACD(e, t) {
    return M(this.configuration).getIndicesMACD(e.indicesTicker, e.timestamp, e.timespan, e.adjusted, e.shortWindow, e.longWindow, e.signalWindow, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getIndicesOpenClose(e, t) {
    return M(this.configuration).getIndicesOpenClose(e.indicesTicker, e.date, t).then((i) => i(this.axios, this.basePath));
  }
  getIndicesRSI(e, t) {
    return M(this.configuration).getIndicesRSI(e.indicesTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getIndicesSMA(e, t) {
    return M(this.configuration).getIndicesSMA(e.indicesTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getIndicesSnapshot(e = {}, t) {
    return M(this.configuration).getIndicesSnapshot(e.tickerAnyOf, e.ticker, e.tickerGte, e.tickerGt, e.tickerLte, e.tickerLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getLastCryptoTrade(e, t) {
    return M(this.configuration).getLastCryptoTrade(e.from, e.to, t).then((i) => i(this.axios, this.basePath));
  }
  getLastCurrencyQuote(e, t) {
    return M(this.configuration).getLastCurrencyQuote(e.from, e.to, t).then((i) => i(this.axios, this.basePath));
  }
  getLastOptionsTrade(e, t) {
    return M(this.configuration).getLastOptionsTrade(e.optionsTicker, t).then((i) => i(this.axios, this.basePath));
  }
  getLastStocksQuote(e, t) {
    return M(this.configuration).getLastStocksQuote(e.stocksTicker, t).then((i) => i(this.axios, this.basePath));
  }
  getLastStocksTrade(e, t) {
    return M(this.configuration).getLastStocksTrade(e.stocksTicker, t).then((i) => i(this.axios, this.basePath));
  }
  getMarketHolidays(e) {
    return M(this.configuration).getMarketHolidays(e).then((t) => t(this.axios, this.basePath));
  }
  getMarketStatus(e) {
    return M(this.configuration).getMarketStatus(e).then((t) => t(this.axios, this.basePath));
  }
  getOptionContract(e, t) {
    return M(this.configuration).getOptionContract(e.underlyingAsset, e.optionContract, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsAggregates(e, t) {
    return M(this.configuration).getOptionsAggregates(e.optionsTicker, e.multiplier, e.timespan, e.from, e.to, e.adjusted, e.sort, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsChain(e, t) {
    return M(this.configuration).getOptionsChain(e.underlyingAsset, e.strikePrice, e.expirationDate, e.contractType, e.strikePriceGte, e.strikePriceGt, e.strikePriceLte, e.strikePriceLt, e.expirationDateGte, e.expirationDateGt, e.expirationDateLte, e.expirationDateLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsContract(e, t) {
    return M(this.configuration).getOptionsContract(e.optionsTicker, e.asOf, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsEMA(e, t) {
    return M(this.configuration).getOptionsEMA(e.optionsTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsMACD(e, t) {
    return M(this.configuration).getOptionsMACD(e.optionsTicker, e.timestamp, e.timespan, e.adjusted, e.shortWindow, e.longWindow, e.signalWindow, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsOpenClose(e, t) {
    return M(this.configuration).getOptionsOpenClose(e.optionsTicker, e.date, e.adjusted, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsQuotes(e, t) {
    return M(this.configuration).getOptionsQuotes(e.optionsTicker, e.timestamp, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsRSI(e, t) {
    return M(this.configuration).getOptionsRSI(e.optionsTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsSMA(e, t) {
    return M(this.configuration).getOptionsSMA(e.optionsTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsTrades(e, t) {
    return M(this.configuration).getOptionsTrades(e.optionsTicker, e.timestamp, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getOptionsV1Exchanges(e = {}, t) {
    return M(this.configuration).getOptionsV1Exchanges(e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getPreviousCryptoAggregates(e, t) {
    return M(this.configuration).getPreviousCryptoAggregates(e.cryptoTicker, e.adjusted, t).then((i) => i(this.axios, this.basePath));
  }
  getPreviousForexAggregates(e, t) {
    return M(this.configuration).getPreviousForexAggregates(e.forexTicker, e.adjusted, t).then((i) => i(this.axios, this.basePath));
  }
  getPreviousIndicesAggregates(e, t) {
    return M(this.configuration).getPreviousIndicesAggregates(e.indicesTicker, t).then((i) => i(this.axios, this.basePath));
  }
  getPreviousOptionsAggregates(e, t) {
    return M(this.configuration).getPreviousOptionsAggregates(e.optionsTicker, e.adjusted, t).then((i) => i(this.axios, this.basePath));
  }
  getPreviousStocksAggregates(e, t) {
    return M(this.configuration).getPreviousStocksAggregates(e.stocksTicker, e.adjusted, t).then((i) => i(this.axios, this.basePath));
  }
  getRelatedCompanies(e, t) {
    return M(this.configuration).getRelatedCompanies(e.ticker, t).then((i) => i(this.axios, this.basePath));
  }
  getSnapshotSummary(e = {}, t) {
    return M(this.configuration).getSnapshotSummary(e.tickerAnyOf, t).then((i) => i(this.axios, this.basePath));
  }
  getSnapshots(e = {}, t) {
    return M(this.configuration).getSnapshots(e.ticker, e.type, e.tickerGte, e.tickerGt, e.tickerLte, e.tickerLt, e.tickerAnyOf, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksAggregates(e, t) {
    return M(this.configuration).getStocksAggregates(e.stocksTicker, e.multiplier, e.timespan, e.from, e.to, e.adjusted, e.sort, e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksEMA(e, t) {
    return M(this.configuration).getStocksEMA(e.stockTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksFilings10KVXSections(e = {}, t) {
    return M(this.configuration).getStocksFilings10KVXSections(e.cik, e.cikAnyOf, e.cikGt, e.cikGte, e.cikLt, e.cikLte, e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.section, e.sectionAnyOf, e.filingDate, e.filingDateGt, e.filingDateGte, e.filingDateLt, e.filingDateLte, e.periodEnd, e.periodEndGt, e.periodEndGte, e.periodEndLt, e.periodEndLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksFilingsVXRiskFactors(e = {}, t) {
    return M(this.configuration).getStocksFilingsVXRiskFactors(e.filingDate, e.filingDateAnyOf, e.filingDateGt, e.filingDateGte, e.filingDateLt, e.filingDateLte, e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.cik, e.cikAnyOf, e.cikGt, e.cikGte, e.cikLt, e.cikLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksFinancialsV1BalanceSheets(e = {}, t) {
    return M(this.configuration).getStocksFinancialsV1BalanceSheets(e.cik, e.cikAnyOf, e.cikGt, e.cikGte, e.cikLt, e.cikLte, e.tickers, e.tickersAllOf, e.tickersAnyOf, e.periodEnd, e.periodEndGt, e.periodEndGte, e.periodEndLt, e.periodEndLte, e.filingDate, e.filingDateGt, e.filingDateGte, e.filingDateLt, e.filingDateLte, e.fiscalYear, e.fiscalYearGt, e.fiscalYearGte, e.fiscalYearLt, e.fiscalYearLte, e.fiscalQuarter, e.fiscalQuarterGt, e.fiscalQuarterGte, e.fiscalQuarterLt, e.fiscalQuarterLte, e.timeframe, e.timeframeAnyOf, e.timeframeGt, e.timeframeGte, e.timeframeLt, e.timeframeLte, e.maxTicker, e.maxTickerAnyOf, e.maxTickerGt, e.maxTickerGte, e.maxTickerLt, e.maxTickerLte, e.minTicker, e.minTickerAnyOf, e.minTickerGt, e.minTickerGte, e.minTickerLt, e.minTickerLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksFinancialsV1CashFlowStatements(e = {}, t) {
    return M(this.configuration).getStocksFinancialsV1CashFlowStatements(e.cik, e.cikAnyOf, e.cikGt, e.cikGte, e.cikLt, e.cikLte, e.periodEnd, e.periodEndGt, e.periodEndGte, e.periodEndLt, e.periodEndLte, e.filingDate, e.filingDateGt, e.filingDateGte, e.filingDateLt, e.filingDateLte, e.tickers, e.tickersAllOf, e.tickersAnyOf, e.fiscalYear, e.fiscalYearGt, e.fiscalYearGte, e.fiscalYearLt, e.fiscalYearLte, e.fiscalQuarter, e.fiscalQuarterGt, e.fiscalQuarterGte, e.fiscalQuarterLt, e.fiscalQuarterLte, e.timeframe, e.timeframeAnyOf, e.timeframeGt, e.timeframeGte, e.timeframeLt, e.timeframeLte, e.maxTicker, e.maxTickerAnyOf, e.maxTickerGt, e.maxTickerGte, e.maxTickerLt, e.maxTickerLte, e.minTicker, e.minTickerAnyOf, e.minTickerGt, e.minTickerGte, e.minTickerLt, e.minTickerLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksFinancialsV1IncomeStatements(e = {}, t) {
    return M(this.configuration).getStocksFinancialsV1IncomeStatements(e.cik, e.cikAnyOf, e.cikGt, e.cikGte, e.cikLt, e.cikLte, e.tickers, e.tickersAllOf, e.tickersAnyOf, e.periodEnd, e.periodEndGt, e.periodEndGte, e.periodEndLt, e.periodEndLte, e.filingDate, e.filingDateGt, e.filingDateGte, e.filingDateLt, e.filingDateLte, e.fiscalYear, e.fiscalYearGt, e.fiscalYearGte, e.fiscalYearLt, e.fiscalYearLte, e.fiscalQuarter, e.fiscalQuarterGt, e.fiscalQuarterGte, e.fiscalQuarterLt, e.fiscalQuarterLte, e.timeframe, e.timeframeAnyOf, e.timeframeGt, e.timeframeGte, e.timeframeLt, e.timeframeLte, e.maxTicker, e.maxTickerAnyOf, e.maxTickerGt, e.maxTickerGte, e.maxTickerLt, e.maxTickerLte, e.minTicker, e.minTickerAnyOf, e.minTickerGt, e.minTickerGte, e.minTickerLt, e.minTickerLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksFinancialsV1Ratios(e = {}, t) {
    return M(this.configuration).getStocksFinancialsV1Ratios(e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.cik, e.cikAnyOf, e.cikGt, e.cikGte, e.cikLt, e.cikLte, e.price, e.priceGt, e.priceGte, e.priceLt, e.priceLte, e.averageVolume, e.averageVolumeGt, e.averageVolumeGte, e.averageVolumeLt, e.averageVolumeLte, e.marketCap, e.marketCapGt, e.marketCapGte, e.marketCapLt, e.marketCapLte, e.earningsPerShare, e.earningsPerShareGt, e.earningsPerShareGte, e.earningsPerShareLt, e.earningsPerShareLte, e.priceToEarnings, e.priceToEarningsGt, e.priceToEarningsGte, e.priceToEarningsLt, e.priceToEarningsLte, e.priceToBook, e.priceToBookGt, e.priceToBookGte, e.priceToBookLt, e.priceToBookLte, e.priceToSales, e.priceToSalesGt, e.priceToSalesGte, e.priceToSalesLt, e.priceToSalesLte, e.priceToCashFlow, e.priceToCashFlowGt, e.priceToCashFlowGte, e.priceToCashFlowLt, e.priceToCashFlowLte, e.priceToFreeCashFlow, e.priceToFreeCashFlowGt, e.priceToFreeCashFlowGte, e.priceToFreeCashFlowLt, e.priceToFreeCashFlowLte, e.dividendYield, e.dividendYieldGt, e.dividendYieldGte, e.dividendYieldLt, e.dividendYieldLte, e.returnOnAssets, e.returnOnAssetsGt, e.returnOnAssetsGte, e.returnOnAssetsLt, e.returnOnAssetsLte, e.returnOnEquity, e.returnOnEquityGt, e.returnOnEquityGte, e.returnOnEquityLt, e.returnOnEquityLte, e.debtToEquity, e.debtToEquityGt, e.debtToEquityGte, e.debtToEquityLt, e.debtToEquityLte, e.current, e.currentGt, e.currentGte, e.currentLt, e.currentLte, e.quick, e.quickGt, e.quickGte, e.quickLt, e.quickLte, e.cash, e.cashGt, e.cashGte, e.cashLt, e.cashLte, e.evToSales, e.evToSalesGt, e.evToSalesGte, e.evToSalesLt, e.evToSalesLte, e.evToEbitda, e.evToEbitdaGt, e.evToEbitdaGte, e.evToEbitdaLt, e.evToEbitdaLte, e.enterpriseValue, e.enterpriseValueGt, e.enterpriseValueGte, e.enterpriseValueLt, e.enterpriseValueLte, e.freeCashFlow, e.freeCashFlowGt, e.freeCashFlowGte, e.freeCashFlowLt, e.freeCashFlowLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksMACD(e, t) {
    return M(this.configuration).getStocksMACD(e.stockTicker, e.timestamp, e.timespan, e.adjusted, e.shortWindow, e.longWindow, e.signalWindow, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksOpenClose(e, t) {
    return M(this.configuration).getStocksOpenClose(e.stocksTicker, e.date, e.adjusted, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksQuotes(e, t) {
    return M(this.configuration).getStocksQuotes(e.stockTicker, e.timestamp, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksRSI(e, t) {
    return M(this.configuration).getStocksRSI(e.stockTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksSMA(e, t) {
    return M(this.configuration).getStocksSMA(e.stockTicker, e.timestamp, e.timespan, e.adjusted, e.window, e.seriesType, e.expandUnderlying, e.order, e.limit, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksSnapshotDirection(e, t) {
    return M(this.configuration).getStocksSnapshotDirection(e.direction, e.includeOtc, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksSnapshotTicker(e, t) {
    return M(this.configuration).getStocksSnapshotTicker(e.stocksTicker, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksSnapshotTickers(e = {}, t) {
    return M(this.configuration).getStocksSnapshotTickers(e.tickers, e.includeOtc, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksTaxonomiesVXRiskFactors(e = {}, t) {
    return M(this.configuration).getStocksTaxonomiesVXRiskFactors(e.taxonomy, e.taxonomyGt, e.taxonomyGte, e.taxonomyLt, e.taxonomyLte, e.primaryCategory, e.primaryCategoryAnyOf, e.primaryCategoryGt, e.primaryCategoryGte, e.primaryCategoryLt, e.primaryCategoryLte, e.secondaryCategory, e.secondaryCategoryAnyOf, e.secondaryCategoryGt, e.secondaryCategoryGte, e.secondaryCategoryLt, e.secondaryCategoryLte, e.tertiaryCategory, e.tertiaryCategoryAnyOf, e.tertiaryCategoryGt, e.tertiaryCategoryGte, e.tertiaryCategoryLt, e.tertiaryCategoryLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksTrades(e, t) {
    return M(this.configuration).getStocksTrades(e.stockTicker, e.timestamp, e.timestampGte, e.timestampGt, e.timestampLte, e.timestampLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksV1Dividends(e = {}, t) {
    return M(this.configuration).getStocksV1Dividends(e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.exDividendDate, e.exDividendDateGt, e.exDividendDateGte, e.exDividendDateLt, e.exDividendDateLte, e.frequency, e.frequencyGt, e.frequencyGte, e.frequencyLt, e.frequencyLte, e.distributionType, e.distributionTypeAnyOf, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksV1Exchanges(e = {}, t) {
    return M(this.configuration).getStocksV1Exchanges(e.limit, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksV1ShortInterest(e = {}, t) {
    return M(this.configuration).getStocksV1ShortInterest(e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.daysToCover, e.daysToCoverAnyOf, e.daysToCoverGt, e.daysToCoverGte, e.daysToCoverLt, e.daysToCoverLte, e.settlementDate, e.settlementDateAnyOf, e.settlementDateGt, e.settlementDateGte, e.settlementDateLt, e.settlementDateLte, e.avgDailyVolume, e.avgDailyVolumeAnyOf, e.avgDailyVolumeGt, e.avgDailyVolumeGte, e.avgDailyVolumeLt, e.avgDailyVolumeLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksV1ShortVolume(e = {}, t) {
    return M(this.configuration).getStocksV1ShortVolume(e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.shortVolumeRatio, e.shortVolumeRatioAnyOf, e.shortVolumeRatioGt, e.shortVolumeRatioGte, e.shortVolumeRatioLt, e.shortVolumeRatioLte, e.totalVolume, e.totalVolumeAnyOf, e.totalVolumeGt, e.totalVolumeGte, e.totalVolumeLt, e.totalVolumeLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksV1Splits(e = {}, t) {
    return M(this.configuration).getStocksV1Splits(e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.executionDate, e.executionDateGt, e.executionDateGte, e.executionDateLt, e.executionDateLte, e.adjustmentType, e.adjustmentTypeAnyOf, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getStocksVXFloat(e = {}, t) {
    return M(this.configuration).getStocksVXFloat(e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.freeFloatPercent, e.freeFloatPercentGt, e.freeFloatPercentGte, e.freeFloatPercentLt, e.freeFloatPercentLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  getTicker(e, t) {
    return M(this.configuration).getTicker(e.ticker, e.date, t).then((i) => i(this.axios, this.basePath));
  }
  getTmxV1CorporateEvents(e = {}, t) {
    return M(this.configuration).getTmxV1CorporateEvents(e.date, e.dateAnyOf, e.dateGt, e.dateGte, e.dateLt, e.dateLte, e.type, e.typeAnyOf, e.typeGt, e.typeGte, e.typeLt, e.typeLte, e.status, e.statusAnyOf, e.statusGt, e.statusGte, e.statusLt, e.statusLte, e.ticker, e.tickerAnyOf, e.tickerGt, e.tickerGte, e.tickerLt, e.tickerLte, e.isin, e.isinAnyOf, e.isinGt, e.isinGte, e.isinLt, e.isinLte, e.tradingVenue, e.tradingVenueAnyOf, e.tradingVenueGt, e.tradingVenueGte, e.tradingVenueLt, e.tradingVenueLte, e.tmxCompanyId, e.tmxCompanyIdGt, e.tmxCompanyIdGte, e.tmxCompanyIdLt, e.tmxCompanyIdLte, e.tmxRecordId, e.tmxRecordIdAnyOf, e.tmxRecordIdGt, e.tmxRecordIdGte, e.tmxRecordIdLt, e.tmxRecordIdLte, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  listConditions(e = {}, t) {
    return M(this.configuration).listConditions(e.assetClass, e.dataType, e.id, e.sip, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  listDividends(e = {}, t) {
    return M(this.configuration).listDividends(e.ticker, e.exDividendDate, e.recordDate, e.declarationDate, e.payDate, e.frequency, e.cashAmount, e.dividendType, e.tickerGte, e.tickerGt, e.tickerLte, e.tickerLt, e.exDividendDateGte, e.exDividendDateGt, e.exDividendDateLte, e.exDividendDateLt, e.recordDateGte, e.recordDateGt, e.recordDateLte, e.recordDateLt, e.declarationDateGte, e.declarationDateGt, e.declarationDateLte, e.declarationDateLt, e.payDateGte, e.payDateGt, e.payDateLte, e.payDateLt, e.cashAmountGte, e.cashAmountGt, e.cashAmountLte, e.cashAmountLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  listExchanges(e = {}, t) {
    return M(this.configuration).listExchanges(e.assetClass, e.locale, t).then((i) => i(this.axios, this.basePath));
  }
  listFinancials(e = {}, t) {
    return M(this.configuration).listFinancials(e.ticker, e.cik, e.companyName, e.sic, e.filingDate, e.periodOfReportDate, e.timeframe, e.includeSources, e.companyNameSearch, e.filingDateGte, e.filingDateGt, e.filingDateLte, e.filingDateLt, e.periodOfReportDateGte, e.periodOfReportDateGt, e.periodOfReportDateLte, e.periodOfReportDateLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  listIPOs(e = {}, t) {
    return M(this.configuration).listIPOs(e.ticker, e.usCode, e.isin, e.listingDate, e.ipoStatus, e.listingDateGte, e.listingDateGt, e.listingDateLte, e.listingDateLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  listNews(e = {}, t) {
    return M(this.configuration).listNews(e.ticker, e.publishedUtc, e.tickerGte, e.tickerGt, e.tickerLte, e.tickerLt, e.publishedUtcGte, e.publishedUtcGt, e.publishedUtcLte, e.publishedUtcLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  listOptionsContracts(e = {}, t) {
    return M(this.configuration).listOptionsContracts(e.underlyingTicker, e.ticker, e.contractType, e.expirationDate, e.asOf, e.strikePrice, e.expired, e.underlyingTickerGte, e.underlyingTickerGt, e.underlyingTickerLte, e.underlyingTickerLt, e.expirationDateGte, e.expirationDateGt, e.expirationDateLte, e.expirationDateLt, e.strikePriceGte, e.strikePriceGt, e.strikePriceLte, e.strikePriceLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  listStockSplits(e = {}, t) {
    return M(this.configuration).listStockSplits(e.ticker, e.executionDate, e.reverseSplit, e.tickerGte, e.tickerGt, e.tickerLte, e.tickerLt, e.executionDateGte, e.executionDateGt, e.executionDateLte, e.executionDateLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
  listTickerTypes(e = {}, t) {
    return M(this.configuration).listTickerTypes(e.assetClass, e.locale, t).then((i) => i(this.axios, this.basePath));
  }
  listTickers(e = {}, t) {
    return M(this.configuration).listTickers(e.ticker, e.type, e.market, e.exchange, e.cusip, e.cik, e.date, e.search, e.active, e.tickerGte, e.tickerGt, e.tickerLte, e.tickerLt, e.order, e.limit, e.sort, t).then((i) => i(this.axios, this.basePath));
  }
};
var li = ((d) => (d.Second = "second", d.Minute = "minute", d.Hour = "hour", d.Day = "day", d.Week = "week", d.Month = "month", d.Quarter = "quarter", d.Year = "year", d))(li || {});
var gi = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(gi || {});
var ci = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(ci || {});
var pi = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(pi || {});
var fi = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(fi || {});
var ui = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(ui || {});
var yi = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(yi || {});
var bi = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(bi || {});
var mi = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(mi || {});
var hi = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(hi || {});
var Ri = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Ri || {});
var xi = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(xi || {});
var Ai = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(Ai || {});
var ki = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(ki || {});
var _i = ((t) => (t.Gainers = "gainers", t.Losers = "losers", t))(_i || {});
var Gi = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Gi || {});
var Oi = ((e) => (e.Timestamp = "timestamp", e))(Oi || {});
var Ci = ((s) => (s[s.NUMBER_0 = 0] = "NUMBER_0", s[s.NUMBER_1 = 1] = "NUMBER_1", s[s.NUMBER_2 = 2] = "NUMBER_2", s[s.NUMBER_3 = 3] = "NUMBER_3", s[s.NUMBER_4 = 4] = "NUMBER_4", s))(Ci || {});
var Vi = ((d) => (d.Second = "second", d.Minute = "minute", d.Hour = "hour", d.Day = "day", d.Week = "week", d.Month = "month", d.Quarter = "quarter", d.Year = "year", d))(Vi || {});
var Si = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Si || {});
var wi = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(wi || {});
var vi = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(vi || {});
var Ii = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Ii || {});
var Li = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(Li || {});
var Ti = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(Ti || {});
var Di = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Di || {});
var Fi = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Fi || {});
var Bi = ((e) => (e.Timestamp = "timestamp", e))(Bi || {});
var Ui = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(Ui || {});
var zi = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(zi || {});
var Ei = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Ei || {});
var Qi = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(Qi || {});
var Mi = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(Mi || {});
var Hi = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Hi || {});
var ji = ((t) => (t.Gainers = "gainers", t.Losers = "losers", t))(ji || {});
var Ki = ((t) => (t.WindowStartAsc = "window_start.asc", t.WindowStartDesc = "window_start.desc", t))(Ki || {});
var Ni = ((t) => (t.TimestampAsc = "timestamp.asc", t.TimestampDesc = "timestamp.desc", t))(Ni || {});
var $i = ((t) => (t.TimestampAsc = "timestamp.asc", t.TimestampDesc = "timestamp.desc", t))($i || {});
var Yi = ((t) => (t.Single = "single", t.Combo = "combo", t))(Yi || {});
var Wi = ((t) => (t.Single = "single", t.Combo = "combo", t))(Wi || {});
var Xi = ((v) => (v.Asia = "asia", v.Base = "base", v.Biofuels = "biofuels", v.Coal = "coal", v.CrossRates = "cross_rates", v.CrudeOil = "crude_oil", v.CustomIndex = "custom_index", v.Dairy = "dairy", v.DjUbsCi = "dj_ubs_ci", v.Electricity = "electricity", v.Emissions = "emissions", v.Europe = "europe", v.Fertilizer = "fertilizer", v.Forestry = "forestry", v.GrainsAndOilseeds = "grains_and_oilseeds", v.IntlIndex = "intl_index", v.LiqNatGasLng = "liq_nat_gas_lng", v.Livestock = "livestock", v.LongTermGov = "long_term_gov", v.LongTermNonGov = "long_term_non_gov", v.Majors = "majors", v.Minors = "minors", v.NatGas = "nat_gas", v.NatGasLiqPetro = "nat_gas_liq_petro", v.Precious = "precious", v.RefinedProducts = "refined_products", v.SAndPGsci = "s_and_p_gsci", v.SelSectorIndex = "sel_sector_index", v.ShortTermGov = "short_term_gov", v.ShortTermNonGov = "short_term_non_gov", v.Softs = "softs", v.Us = "us", v.UsIndex = "us_index", v.WetBulk = "wet_bulk", v))(Xi || {});
var Ji = ((v) => (v.Asia = "asia", v.Base = "base", v.Biofuels = "biofuels", v.Coal = "coal", v.CrossRates = "cross_rates", v.CrudeOil = "crude_oil", v.CustomIndex = "custom_index", v.Dairy = "dairy", v.DjUbsCi = "dj_ubs_ci", v.Electricity = "electricity", v.Emissions = "emissions", v.Europe = "europe", v.Fertilizer = "fertilizer", v.Forestry = "forestry", v.GrainsAndOilseeds = "grains_and_oilseeds", v.IntlIndex = "intl_index", v.LiqNatGasLng = "liq_nat_gas_lng", v.Livestock = "livestock", v.LongTermGov = "long_term_gov", v.LongTermNonGov = "long_term_non_gov", v.Majors = "majors", v.Minors = "minors", v.NatGas = "nat_gas", v.NatGasLiqPetro = "nat_gas_liq_petro", v.Precious = "precious", v.RefinedProducts = "refined_products", v.SAndPGsci = "s_and_p_gsci", v.SelSectorIndex = "sel_sector_index", v.ShortTermGov = "short_term_gov", v.ShortTermNonGov = "short_term_non_gov", v.Softs = "softs", v.Us = "us", v.UsIndex = "us_index", v.WetBulk = "wet_bulk", v))(Ji || {});
var Zi = ((x) => (x.Asian = "asian", x.Canadian = "canadian", x.Cat = "cat", x.CoolingDegreeDays = "cooling_degree_days", x.Ercot = "ercot", x.European = "european", x.Gulf = "gulf", x.HeatingDegreeDays = "heating_degree_days", x.IsoNe = "iso_ne", x.LargeCapIndex = "large_cap_index", x.MidCapIndex = "mid_cap_index", x.Miso = "miso", x.NorthAmerican = "north_american", x.Nyiso = "nyiso", x.Pjm = "pjm", x.SmallCapIndex = "small_cap_index", x.West = "west", x.WesternPower = "western_power", x))(Zi || {});
var qi = ((x) => (x.Asian = "asian", x.Canadian = "canadian", x.Cat = "cat", x.CoolingDegreeDays = "cooling_degree_days", x.Ercot = "ercot", x.European = "european", x.Gulf = "gulf", x.HeatingDegreeDays = "heating_degree_days", x.IsoNe = "iso_ne", x.LargeCapIndex = "large_cap_index", x.MidCapIndex = "mid_cap_index", x.Miso = "miso", x.NorthAmerican = "north_american", x.Nyiso = "nyiso", x.Pjm = "pjm", x.SmallCapIndex = "small_cap_index", x.West = "west", x.WesternPower = "western_power", x))(qi || {});
var Pi = ((i) => (i.AltInvestment = "alt_investment", i.Commodity = "commodity", i.Financials = "financials", i))(Pi || {});
var es = ((i) => (i.AltInvestment = "alt_investment", i.Commodity = "commodity", i.Financials = "financials", i))(es || {});
var ns = ((g) => (g.Agricultural = "agricultural", g.CommodityIndex = "commodity_index", g.Energy = "energy", g.Equity = "equity", g.ForeignExchange = "foreign_exchange", g.Freight = "freight", g.Housing = "housing", g.InterestRate = "interest_rate", g.Metals = "metals", g.Weather = "weather", g))(ns || {});
var ts = ((g) => (g.Agricultural = "agricultural", g.CommodityIndex = "commodity_index", g.Energy = "energy", g.Equity = "equity", g.ForeignExchange = "foreign_exchange", g.Freight = "freight", g.Housing = "housing", g.InterestRate = "interest_rate", g.Metals = "metals", g.Weather = "weather", g))(ts || {});
var is = ((t) => (t.Single = "single", t.Combo = "combo", t))(is || {});
var ss = ((t) => (t.Single = "single", t.Combo = "combo", t))(ss || {});
var os = ((d) => (d.Second = "second", d.Minute = "minute", d.Hour = "hour", d.Day = "day", d.Week = "week", d.Month = "month", d.Quarter = "quarter", d.Year = "year", d))(os || {});
var rs = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(rs || {});
var as = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(as || {});
var ds = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(ds || {});
var ls = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(ls || {});
var gs = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(gs || {});
var cs = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(cs || {});
var ps = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(ps || {});
var fs = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(fs || {});
var us = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(us || {});
var ys = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(ys || {});
var bs = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(bs || {});
var ms = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(ms || {});
var hs = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(hs || {});
var Rs = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Rs || {});
var xs = ((e) => (e.Ticker = "ticker", e))(xs || {});
var As = ((d) => (d.Second = "second", d.Minute = "minute", d.Hour = "hour", d.Day = "day", d.Week = "week", d.Month = "month", d.Quarter = "quarter", d.Year = "year", d))(As || {});
var ks = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(ks || {});
var _s = ((t) => (t.Call = "call", t.Put = "put", t))(_s || {});
var Gs = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Gs || {});
var Os = ((i) => (i.Ticker = "ticker", i.ExpirationDate = "expiration_date", i.StrikePrice = "strike_price", i))(Os || {});
var Cs = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(Cs || {});
var Vs = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(Vs || {});
var Ss = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Ss || {});
var ws = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(ws || {});
var vs = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(vs || {});
var Is = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Is || {});
var Ls = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Ls || {});
var Ts = ((e) => (e.Timestamp = "timestamp", e))(Ts || {});
var Ds = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(Ds || {});
var Fs = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(Fs || {});
var Bs = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Bs || {});
var Us = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(Us || {});
var zs = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(zs || {});
var Es = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Es || {});
var Qs = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Qs || {});
var Ms = ((e) => (e.Timestamp = "timestamp", e))(Ms || {});
var Hs = ((s) => (s.Stocks = "stocks", s.Options = "options", s.Crypto = "crypto", s.Fx = "fx", s.Indices = "indices", s))(Hs || {});
var js = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(js || {});
var Ks = ((e) => (e.Ticker = "ticker", e))(Ks || {});
var Ns = ((d) => (d.Second = "second", d.Minute = "minute", d.Hour = "hour", d.Day = "day", d.Week = "week", d.Month = "month", d.Quarter = "quarter", d.Year = "year", d))(Ns || {});
var $s = ((t) => (t.Asc = "asc", t.Desc = "desc", t))($s || {});
var Ys = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(Ys || {});
var Ws = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(Ws || {});
var Xs = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Xs || {});
var Js = ((t) => (t.Business = "business", t.RiskFactors = "risk_factors", t))(Js || {});
var Zs = ((t) => (t.Business = "business", t.RiskFactors = "risk_factors", t))(Zs || {});
var qs = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(qs || {});
var Ps = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(Ps || {});
var eo = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(eo || {});
var no = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(no || {});
var to = ((e) => (e.Timestamp = "timestamp", e))(to || {});
var io = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(io || {});
var so = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(so || {});
var oo = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(oo || {});
var ro = ((r) => (r.Minute = "minute", r.Hour = "hour", r.Day = "day", r.Week = "week", r.Month = "month", r.Quarter = "quarter", r.Year = "year", r))(ro || {});
var ao = ((n) => (n.Open = "open", n.High = "high", n.Low = "low", n.Close = "close", n))(ao || {});
var lo = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(lo || {});
var go = ((t) => (t.Gainers = "gainers", t.Losers = "losers", t))(go || {});
var co = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(co || {});
var po = ((e) => (e.Timestamp = "timestamp", e))(po || {});
var fo = ((s) => (s.Recurring = "recurring", s.Special = "special", s.Supplemental = "supplemental", s.Irregular = "irregular", s.Unknown = "unknown", s))(fo || {});
var uo = ((s) => (s.Recurring = "recurring", s.Special = "special", s.Supplemental = "supplemental", s.Irregular = "irregular", s.Unknown = "unknown", s))(uo || {});
var yo = ((i) => (i.ForwardSplit = "forward_split", i.ReverseSplit = "reverse_split", i.StockDividend = "stock_dividend", i))(yo || {});
var bo = ((i) => (i.ForwardSplit = "forward_split", i.ReverseSplit = "reverse_split", i.StockDividend = "stock_dividend", i))(bo || {});
var mo = ((n) => (n.Stocks = "stocks", n.Options = "options", n.Crypto = "crypto", n.Fx = "fx", n))(mo || {});
var ho = ((i) => (i.Trade = "trade", i.Bbo = "bbo", i.Nbbo = "nbbo", i))(ho || {});
var Ro = ((i) => (i.Cta = "CTA", i.Utp = "UTP", i.Opra = "OPRA", i))(Ro || {});
var xo = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(xo || {});
var Ao = ((o) => (o.AssetClass = "asset_class", o.Id = "id", o.Type = "type", o.Name = "name", o.DataTypes = "data_types", o.Legacy = "legacy", o))(Ao || {});
var ko = ((r) => (r[r.NUMBER_0 = 0] = "NUMBER_0", r[r.NUMBER_1 = 1] = "NUMBER_1", r[r.NUMBER_2 = 2] = "NUMBER_2", r[r.NUMBER_4 = 4] = "NUMBER_4", r[r.NUMBER_12 = 12] = "NUMBER_12", r[r.NUMBER_24 = 24] = "NUMBER_24", r[r.NUMBER_52 = 52] = "NUMBER_52", r))(ko || {});
var _o = ((n) => (n.Cd = "CD", n.Sc = "SC", n.Lt = "LT", n.St = "ST", n))(_o || {});
var Go = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Go || {});
var Oo = ((o) => (o.ExDividendDate = "ex_dividend_date", o.PayDate = "pay_date", o.DeclarationDate = "declaration_date", o.RecordDate = "record_date", o.CashAmount = "cash_amount", o.Ticker = "ticker", o))(Oo || {});
var Co = ((s) => (s.Stocks = "stocks", s.Options = "options", s.Crypto = "crypto", s.Fx = "fx", s.Futures = "futures", s))(Co || {});
var Vo = ((t) => (t.Us = "us", t.Global = "global", t))(Vo || {});
var So = ((i) => (i.Annual = "annual", i.Quarterly = "quarterly", i.Ttm = "ttm", i))(So || {});
var wo = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(wo || {});
var vo = ((t) => (t.FilingDate = "filing_date", t.PeriodOfReportDate = "period_of_report_date", t))(vo || {});
var Io = ((r) => (r.DirectListingProcess = "direct_listing_process", r.History = "history", r.New = "new", r.Pending = "pending", r.Postponed = "postponed", r.Rumor = "rumor", r.Withdrawn = "withdrawn", r))(Io || {});
var Lo = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Lo || {});
var To = ((c) => (c.ListingDate = "listing_date", c.Ticker = "ticker", c.LastUpdated = "last_updated", c.SecurityType = "security_type", c.IssuerName = "issuer_name", c.CurrencyCode = "currency_code", c.Isin = "isin", c.UsCode = "us_code", c.FinalIssuePrice = "final_issue_price", c.MinSharesOffered = "min_shares_offered", c.MaxSharesOffered = "max_shares_offered", c.LowestOfferPrice = "lowest_offer_price", c.HighestOfferPrice = "highest_offer_price", c.TotalOfferSize = "total_offer_size", c.SharesOutstanding = "shares_outstanding", c.PrimaryExchange = "primary_exchange", c.LotSize = "lot_size", c.SecurityDescription = "security_description", c.IpoStatus = "ipo_status", c.AnnouncedDate = "announced_date", c))(To || {});
var Do = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Do || {});
var Fo = ((e) => (e.PublishedUtc = "published_utc", e))(Fo || {});
var Bo = ((t) => (t.Call = "call", t.Put = "put", t))(Bo || {});
var Uo = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Uo || {});
var zo = ((n) => (n.Ticker = "ticker", n.UnderlyingTicker = "underlying_ticker", n.ExpirationDate = "expiration_date", n.StrikePrice = "strike_price", n))(zo || {});
var Eo = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(Eo || {});
var Qo = ((t) => (t.ExecutionDate = "execution_date", t.Ticker = "ticker", t))(Qo || {});
var Mo = ((s) => (s.Stocks = "stocks", s.Options = "options", s.Crypto = "crypto", s.Fx = "fx", s.Indices = "indices", s))(Mo || {});
var Ho = ((t) => (t.Us = "us", t.Global = "global", t))(Ho || {});
var jo = ((G) => (G.Cs = "CS", G.Adrc = "ADRC", G.Adrp = "ADRP", G.Adrr = "ADRR", G.Unit = "UNIT", G.Right = "RIGHT", G.Pfd = "PFD", G.Fund = "FUND", G.Sp = "SP", G.Warrant = "WARRANT", G.Index = "INDEX", G.Etf = "ETF", G.Etn = "ETN", G.Os = "OS", G.Gdr = "GDR", G.Other = "OTHER", G.Nyrs = "NYRS", G.Agen = "AGEN", G.Eqlk = "EQLK", G.Bond = "BOND", G.Adrw = "ADRW", G.Basket = "BASKET", G.Lt = "LT", G))(jo || {});
var Ko = ((s) => (s.Stocks = "stocks", s.Crypto = "crypto", s.Fx = "fx", s.Otc = "otc", s.Indices = "indices", s))(Ko || {});
var No = ((t) => (t.Asc = "asc", t.Desc = "desc", t))(No || {});
var $o = ((u) => (u.Ticker = "ticker", u.Name = "name", u.Market = "market", u.Locale = "locale", u.PrimaryExchange = "primary_exchange", u.Type = "type", u.CurrencySymbol = "currency_symbol", u.CurrencyName = "currency_name", u.BaseCurrencySymbol = "base_currency_symbol", u.BaseCurrencyName = "base_currency_name", u.Cik = "cik", u.CompositeFigi = "composite_figi", u.ShareClassFigi = "share_class_figi", u.LastUpdatedUtc = "last_updated_utc", u.DelistedUtc = "delisted_utc", u))($o || {});
var Vn = class {
  constructor(e = {}) {
    this.apiKey = e.apiKey, this.username = e.username, this.password = e.password, this.accessToken = e.accessToken, this.basePath = e.basePath, this.serverIndex = e.serverIndex, this.baseOptions = { ...e.baseOptions, headers: { ...e.baseOptions?.headers } }, this.formDataCtor = e.formDataCtor;
  }
  isJsonMime(e) {
    let t = new RegExp("^(application/json|[^;/ \t]+/[^;/ \t]+[+]json)[ \t]*(;.*)?$", "i");
    return e !== null && (t.test(e) || e.toLowerCase() === "application/json-patch+json");
  }
};
var Jo = (a, e, t) => {
  let i = new Vn({ apiKey: a }), n = "https://api.massive.com", s = axios_default.create();
  return s.interceptors.response.use(async (o) => {
    if (t?.pagination && o?.data?.next_url) {
      let r = await s.get(`${o.data.next_url}&apiKey=${a}`), { results: d, count: l } = r;
      return { ...o.data, results: [...d, ...o.data?.results], ...o.data?.count && { count: o.data.count + l } };
    }
    return o?.data;
  }), new Cn(i, e || n, s);
};

// src/lib/utils.ts
function getApiKey() {
  const key = process.env.POLY_API_KEY;
  if (!key) {
    console.error("Error: POLY_API_KEY environment variable is not set.");
    console.error("Create a .env file with: POLY_API_KEY=your_key_here");
    process.exit(1);
  }
  return key;
}
function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let i = 0;i < rest.length; i++) {
    const arg = rest[i] || "";
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }
  return { command: command || "help", flags };
}
function requireFlag(flags, name) {
  const val = flags[name];
  if (!val) {
    console.error(`Error: --${name} is required for this command.`);
    process.exit(1);
  }
  return val;
}
function num(v) {
  return v ? Number(v) : undefined;
}
function bool(v) {
  if (v === undefined)
    return;
  return v === "true" || v === "1";
}
function list(v) {
  if (!v)
    return;
  return v.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}
async function output(promise) {
  try {
    const res = await promise;
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error("API Error:", e.message ?? e);
    process.exit(1);
  }
}

// src/lib/api.ts
var api = Jo(getApiKey(), "https://api.massive.com");

// src/commands/stocks.ts
var stocksCommands = {
  "stocks-aggs": {
    desc: "Stock aggregate bars (OHLCV)",
    usage: "--ticker AAPL --from 2025-01-01 --to 2025-01-31 [--timespan day] [--multiplier 1] [--adjusted true] [--sort asc] [--limit 120]",
    handler: async (_api, f) => {
      const params = {
        stocksTicker: requireFlag(f, "ticker"),
        multiplier: num(f.multiplier) ?? 1,
        timespan: f.timespan ?? "day",
        from: requireFlag(f, "from"),
        to: requireFlag(f, "to"),
        adjusted: bool(f.adjusted) ?? true,
        sort: f.sort ?? "asc",
        limit: num(f.limit) ?? 120
      };
      await output(api.getStocksAggregates(params));
    }
  },
  "stocks-trades": {
    desc: "Stock trades",
    usage: "--ticker AAPL [--timestamp ...] [--timestamp-gte ...] [--timestamp-gt ...] [--timestamp-lte ...] [--timestamp-lt ...] [--limit 10] [--order asc] [--sort timestamp]",
    handler: async (_api, f) => {
      const params = {
        stockTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"],
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.getStocksTrades(params));
    }
  },
  "stocks-quotes": {
    desc: "Stock quotes (NBBO)",
    usage: "--ticker AAPL [--timestamp ...] [--timestamp-gte ...] [--timestamp-gt ...] [--timestamp-lte ...] [--timestamp-lt ...] [--limit 10] [--order asc] [--sort timestamp]",
    handler: async (_api, f) => {
      const params = {
        stockTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"],
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.getStocksQuotes(params));
    }
  },
  "stocks-snapshot": {
    desc: "Stock ticker snapshot",
    usage: "--ticker AAPL",
    handler: async (_api, f) => {
      const params = {
        stocksTicker: requireFlag(f, "ticker")
      };
      await output(api.getStocksSnapshotTicker(params));
    }
  },
  "stocks-open-close": {
    desc: "Stock daily open/close",
    usage: "--ticker AAPL --date 2025-01-15 [--adjusted true]",
    handler: async (_api, f) => {
      const params = {
        stocksTicker: requireFlag(f, "ticker"),
        date: requireFlag(f, "date"),
        adjusted: bool(f.adjusted)
      };
      await output(api.getStocksOpenClose(params));
    }
  },
  "stocks-previous": {
    desc: "Stock previous day aggregates",
    usage: "--ticker AAPL [--adjusted true]",
    handler: async (_api, f) => {
      const params = {
        stocksTicker: requireFlag(f, "ticker"),
        adjusted: bool(f.adjusted)
      };
      await output(api.getPreviousStocksAggregates(params));
    }
  },
  "stocks-grouped": {
    desc: "Stock grouped daily aggregates",
    usage: "--date 2025-01-15 [--adjusted true] [--include-otc false]",
    handler: async (_api, f) => {
      const params = {
        date: requireFlag(f, "date"),
        adjusted: bool(f.adjusted),
        includeOtc: bool(f["include-otc"])
      };
      await output(api.getGroupedStocksAggregates(params));
    }
  },
  "stocks-sma": {
    desc: "Stock SMA",
    usage: "--ticker AAPL [--timespan day] [--window 50] [--series-type close] [--expand-underlying true] [--order asc] [--limit 10] [--timestamp ...] [--timestamp-gte ...]",
    handler: async (_api, f) => {
      const params = {
        stockTicker: requireFlag(f, "ticker"),
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"]
      };
      await output(api.getStocksSMA(params));
    }
  },
  "stocks-ema": {
    desc: "Stock EMA",
    usage: "--ticker AAPL [--timespan day] [--window 50] [--series-type close] [--expand-underlying true] [--order asc] [--limit 10] [--timestamp ...] [--timestamp-gte ...]",
    handler: async (_api, f) => {
      const params = {
        stockTicker: requireFlag(f, "ticker"),
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"]
      };
      await output(api.getStocksEMA(params));
    }
  },
  "stocks-rsi": {
    desc: "Stock RSI",
    usage: "--ticker AAPL [--timespan day] [--window 14] [--series-type close] [--expand-underlying true] [--order asc] [--limit 10] [--timestamp ...] [--timestamp-gte ...]",
    handler: async (_api, f) => {
      const params = {
        stockTicker: requireFlag(f, "ticker"),
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        limit: num(f.limit),
        order: f.order,
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"]
      };
      await output(api.getStocksRSI(params));
    }
  },
  "stocks-macd": {
    desc: "Stock MACD",
    usage: "--ticker AAPL [--timespan day] [--short-window 12] [--long-window 26] [--signal-window 9] [--series-type close] [--expand-underlying true] [--order asc] [--limit 10] [--timestamp ...] [--timestamp-gte ...]",
    handler: async (_api, f) => {
      const params = {
        stockTicker: requireFlag(f, "ticker"),
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        shortWindow: num(f["short-window"]),
        longWindow: num(f["long-window"]),
        signalWindow: num(f["signal-window"]),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"]
      };
      await output(api.getStocksMACD(params));
    }
  },
  "last-trade": {
    desc: "Last stock trade",
    usage: "--ticker AAPL",
    handler: async (_api, f) => {
      const params = {
        stocksTicker: requireFlag(f, "ticker")
      };
      await output(api.getLastStocksTrade(params));
    }
  },
  "last-quote": {
    desc: "Last stock quote",
    usage: "--ticker AAPL",
    handler: async (_api, f) => {
      const params = {
        stocksTicker: requireFlag(f, "ticker")
      };
      await output(api.getLastStocksQuote(params));
    }
  }
};

// src/commands/crypto.ts
var cryptoCommands = {
  "crypto-aggs": {
    desc: "Crypto aggregate bars",
    usage: "--ticker X:BTCUSD --from 2025-01-01 --to 2025-01-31 [--timespan day] [--multiplier 1] [--adjusted true] [--sort asc] [--limit 120]",
    handler: async (_api, f) => {
      const params = {
        cryptoTicker: requireFlag(f, "ticker"),
        multiplier: num(f.multiplier) ?? 1,
        timespan: f.timespan ?? "day",
        from: requireFlag(f, "from"),
        to: requireFlag(f, "to"),
        adjusted: bool(f.adjusted) ?? true,
        sort: f.sort ?? "asc",
        limit: num(f.limit) ?? 120
      };
      await output(api.getCryptoAggregates(params));
    }
  },
  "crypto-trades": {
    desc: "Crypto trades",
    usage: "--ticker X:BTCUSD [--timestamp ...] [--timestamp-gte ...] [--timestamp-lt ...] [--order asc] [--limit 10] [--sort timestamp]",
    handler: async (_api, f) => {
      const params = {
        cryptoTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"],
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.getCryptoTrades(params));
    }
  },
  "crypto-snapshot": {
    desc: "Crypto ticker snapshot",
    usage: "--ticker X:BTCUSD",
    handler: async (_api, f) => {
      const params = {
        ticker: requireFlag(f, "ticker")
      };
      await output(api.getCryptoSnapshotTicker(params));
    }
  },
  "crypto-snapshot-direction": {
    desc: "Crypto snapshot direction",
    usage: "--direction gainers|losers",
    handler: async (_api, f) => {
      const direction = requireFlag(f, "direction");
      await output(api.getCryptoSnapshotDirection({ direction }));
    }
  },
  "crypto-snapshot-tickers": {
    desc: "Crypto snapshot tickers",
    usage: "[--tickers X:BTCUSD,X:ETHUSD]",
    handler: async (_api, f) => {
      await output(api.getCryptoSnapshotTickers({
        tickers: list(f.tickers)
      }));
    }
  },
  "crypto-open-close": {
    desc: "Crypto daily open/close",
    usage: "--from BTC --to USD --date 2025-01-15 [--adjusted true]",
    handler: async (_api, f) => {
      const params = {
        from: requireFlag(f, "from"),
        to: requireFlag(f, "to"),
        date: requireFlag(f, "date"),
        adjusted: bool(f.adjusted)
      };
      await output(api.getCryptoOpenClose(params));
    }
  },
  "crypto-previous": {
    desc: "Crypto previous day aggregates",
    usage: "--ticker X:BTCUSD [--adjusted true]",
    handler: async (_api, f) => {
      const params = {
        cryptoTicker: requireFlag(f, "ticker"),
        adjusted: bool(f.adjusted)
      };
      await output(api.getPreviousCryptoAggregates(params));
    }
  },
  "crypto-grouped": {
    desc: "Crypto grouped daily aggregates",
    usage: "--date 2025-01-15 [--adjusted true]",
    handler: async (_api, f) => {
      const params = {
        date: requireFlag(f, "date"),
        adjusted: bool(f.adjusted)
      };
      await output(api.getGroupedCryptoAggregates(params));
    }
  },
  "crypto-sma": {
    desc: "Crypto SMA",
    usage: "--ticker X:BTCUSD [--timespan day] [--window 50] [--timestamp ...] [--series-type close] [--expand-underlying true] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        cryptoTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit),
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"]
      };
      await output(api.getCryptoSMA(params));
    }
  },
  "crypto-ema": {
    desc: "Crypto EMA",
    usage: "--ticker X:BTCUSD [--timespan day] [--window 50] [--timestamp ...] [--series-type close] [--expand-underlying true] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        cryptoTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit),
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"]
      };
      await output(api.getCryptoEMA(params));
    }
  },
  "crypto-rsi": {
    desc: "Crypto RSI",
    usage: "--ticker X:BTCUSD [--timespan day] [--window 14] [--timestamp ...] [--series-type close] [--expand-underlying true] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        cryptoTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit),
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"]
      };
      await output(api.getCryptoRSI(params));
    }
  },
  "crypto-macd": {
    desc: "Crypto MACD",
    usage: "--ticker X:BTCUSD [--timespan day] [--short-window 12] [--long-window 26] [--signal-window 9] [--timestamp ...] [--series-type close] [--expand-underlying true] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        cryptoTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        shortWindow: num(f["short-window"]),
        longWindow: num(f["long-window"]),
        signalWindow: num(f["signal-window"]),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit),
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"]
      };
      await output(api.getCryptoMACD(params));
    }
  },
  "last-crypto-trade": {
    desc: "Last crypto trade",
    usage: "--from BTC --to USD",
    handler: async (_api, f) => {
      const params = {
        from: requireFlag(f, "from"),
        to: requireFlag(f, "to")
      };
      await output(api.getLastCryptoTrade(params));
    }
  }
};

// src/commands/forex.ts
var forexCommands = {
  "forex-aggs": {
    desc: "Forex aggregate bars",
    usage: "--ticker C:EURUSD --from 2025-01-01 --to 2025-01-31 [--timespan day] [--multiplier 1] [--adjusted true] [--sort asc] [--limit 120]",
    handler: async (_api, f) => {
      const params = {
        forexTicker: requireFlag(f, "ticker"),
        multiplier: num(f.multiplier) ?? 1,
        timespan: f.timespan ?? "day",
        from: requireFlag(f, "from"),
        to: requireFlag(f, "to"),
        adjusted: bool(f.adjusted) ?? true,
        sort: f.sort ?? "asc",
        limit: num(f.limit) ?? 120
      };
      await output(api.getForexAggregates(params));
    }
  },
  "forex-quotes": {
    desc: "Forex quotes",
    usage: "--ticker C:EURUSD [--timestamp 2025-01-01] [--timestamp-gte 2025-01-01] [--timestamp-gt 2025-01-01] [--timestamp-lte 2025-01-02] [--timestamp-lt 2025-01-02] [--order asc] [--limit 10] [--sort timestamp]",
    handler: async (_api, f) => {
      const params = {
        fxTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"],
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.getForexQuotes(params));
    }
  },
  "forex-snapshot": {
    desc: "Forex ticker snapshot",
    usage: "--ticker C:EURUSD",
    handler: async (_api, f) => {
      const params = {
        ticker: requireFlag(f, "ticker")
      };
      await output(api.getForexSnapshotTicker(params));
    }
  },
  "forex-previous": {
    desc: "Forex previous day aggregates",
    usage: "--ticker C:EURUSD [--adjusted true]",
    handler: async (_api, f) => {
      const params = {
        forexTicker: requireFlag(f, "ticker"),
        adjusted: bool(f.adjusted)
      };
      await output(api.getPreviousForexAggregates(params));
    }
  },
  "forex-grouped": {
    desc: "Forex grouped daily aggregates",
    usage: "--date 2025-01-15 [--adjusted true]",
    handler: async (_api, f) => {
      const params = {
        date: requireFlag(f, "date"),
        adjusted: bool(f.adjusted)
      };
      await output(api.getGroupedForexAggregates(params));
    }
  },
  "forex-sma": {
    desc: "Forex SMA",
    usage: "--ticker C:EURUSD [--timestamp 2025-01-01] [--timestamp-gte 2025-01-01] [--timestamp-gt 2025-01-01] [--timestamp-lte 2025-01-02] [--timestamp-lt 2025-01-02] [--timespan day] [--adjusted true] [--window 50] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        fxTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"],
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getForexSMA(params));
    }
  },
  "forex-ema": {
    desc: "Forex EMA",
    usage: "--ticker C:EURUSD [--timestamp 2025-01-01] [--timestamp-gte 2025-01-01] [--timestamp-gt 2025-01-01] [--timestamp-lte 2025-01-02] [--timestamp-lt 2025-01-02] [--timespan day] [--adjusted true] [--window 50] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        fxTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"],
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getForexEMA(params));
    }
  },
  "forex-rsi": {
    desc: "Forex RSI",
    usage: "--ticker C:EURUSD [--timestamp 2025-01-01] [--timestamp-gte 2025-01-01] [--timestamp-gt 2025-01-01] [--timestamp-lte 2025-01-02] [--timestamp-lt 2025-01-02] [--timespan day] [--adjusted true] [--window 14] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        fxTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"],
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getForexRSI(params));
    }
  },
  "forex-macd": {
    desc: "Forex MACD",
    usage: "--ticker C:EURUSD [--timestamp 2025-01-01] [--timestamp-gte 2025-01-01] [--timestamp-gt 2025-01-01] [--timestamp-lte 2025-01-02] [--timestamp-lt 2025-01-02] [--timespan day] [--adjusted true] [--short-window 12] [--long-window 26] [--signal-window 9] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        fxTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"],
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        shortWindow: num(f["short-window"]),
        longWindow: num(f["long-window"]),
        signalWindow: num(f["signal-window"]),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getForexMACD(params));
    }
  },
  "currency-conversion": {
    desc: "Currency conversion",
    usage: "--from USD --to EUR [--amount 100] [--precision 2]",
    handler: async (_api, f) => {
      const params = {
        from: requireFlag(f, "from"),
        to: requireFlag(f, "to"),
        amount: num(f.amount),
        precision: num(f.precision)
      };
      await output(api.getCurrencyConversion(params));
    }
  },
  "last-forex-quote": {
    desc: "Last forex quote",
    usage: "--from EUR --to USD",
    handler: async (_api, f) => {
      const params = {
        from: requireFlag(f, "from"),
        to: requireFlag(f, "to")
      };
      await output(api.getLastCurrencyQuote(params));
    }
  }
};

// src/commands/indices.ts
var indicesCommands = {
  "indices-aggs": {
    desc: "Indices aggregate bars",
    usage: "--ticker I:SPX --from 2025-01-01 --to 2025-01-31 [--timespan day] [--multiplier 1] [--sort asc] [--limit 120]",
    handler: async (_api, f) => {
      const params = {
        indicesTicker: requireFlag(f, "ticker"),
        multiplier: num(f.multiplier) ?? 1,
        timespan: f.timespan ?? "day",
        from: requireFlag(f, "from"),
        to: requireFlag(f, "to"),
        sort: f.sort,
        limit: num(f.limit)
      };
      await output(api.getIndicesAggregates(params));
    }
  },
  "indices-open-close": {
    desc: "Indices open/close",
    usage: "--ticker I:SPX --date 2025-01-15",
    handler: async (_api, f) => {
      const params = {
        indicesTicker: requireFlag(f, "ticker"),
        date: requireFlag(f, "date")
      };
      await output(api.getIndicesOpenClose(params));
    }
  },
  "indices-snapshot": {
    desc: "Indices snapshot",
    usage: "[--ticker I:SPX]",
    handler: async (_api, f) => {
      const params = {
        tickerAnyOf: f.ticker
      };
      await output(api.getIndicesSnapshot(params));
    }
  },
  "indices-previous": {
    desc: "Indices previous day aggregates",
    usage: "--ticker I:SPX",
    handler: async (_api, f) => {
      const params = {
        indicesTicker: requireFlag(f, "ticker")
      };
      await output(api.getPreviousIndicesAggregates(params));
    }
  },
  "indices-sma": {
    desc: "Indices SMA",
    usage: "--ticker I:SPX [--timestamp 2025-01-01] [--timespan day] [--adjusted true] [--window 50] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        indicesTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getIndicesSMA(params));
    }
  },
  "indices-ema": {
    desc: "Indices EMA",
    usage: "--ticker I:SPX [--timestamp 2025-01-01] [--timespan day] [--adjusted true] [--window 50] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        indicesTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getIndicesEMA(params));
    }
  },
  "indices-rsi": {
    desc: "Indices RSI",
    usage: "--ticker I:SPX [--timestamp 2025-01-01] [--timespan day] [--adjusted true] [--window 14] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        indicesTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getIndicesRSI(params));
    }
  },
  "indices-macd": {
    desc: "Indices MACD",
    usage: "--ticker I:SPX [--timestamp 2025-01-01] [--timespan day] [--adjusted true] [--short-window 12] [--long-window 26] [--signal-window 9] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        indicesTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        shortWindow: num(f["short-window"]),
        longWindow: num(f["long-window"]),
        signalWindow: num(f["signal-window"]),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getIndicesMACD(params));
    }
  }
};

// src/commands/options.ts
var optionsCommands = {
  "options-aggs": {
    desc: "Options aggregate bars",
    usage: "--ticker O:AAPL230616C00150000 --from 2025-01-01 --to 2025-01-31 [--timespan day] [--multiplier 1] [--adjusted true] [--sort asc] [--limit 120]",
    handler: async (_api, f) => {
      const params = {
        optionsTicker: requireFlag(f, "ticker"),
        multiplier: num(f.multiplier) ?? 1,
        timespan: f.timespan ?? "day",
        from: requireFlag(f, "from"),
        to: requireFlag(f, "to"),
        adjusted: bool(f.adjusted) ?? true,
        sort: f.sort,
        limit: num(f.limit)
      };
      await output(api.getOptionsAggregates(params));
    }
  },
  "options-trades": {
    desc: "Options trades",
    usage: "--ticker O:AAPL230616C00150000 [--timestamp 2025-01-01] [--timestamp-gte 2025-01-01] [--timestamp-gt 2025-01-01] [--timestamp-lte 2025-01-02] [--timestamp-lt 2025-01-02] [--order asc] [--limit 10] [--sort timestamp]",
    handler: async (_api, f) => {
      const params = {
        optionsTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"],
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.getOptionsTrades(params));
    }
  },
  "options-quotes": {
    desc: "Options quotes",
    usage: "--ticker O:AAPL230616C00150000 [--timestamp 2025-01-01] [--timestamp-gte 2025-01-01] [--timestamp-gt 2025-01-01] [--timestamp-lte 2025-01-02] [--timestamp-lt 2025-01-02] [--order asc] [--limit 10] [--sort timestamp]",
    handler: async (_api, f) => {
      const params = {
        optionsTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timestampGte: f["timestamp-gte"],
        timestampGt: f["timestamp-gt"],
        timestampLte: f["timestamp-lte"],
        timestampLt: f["timestamp-lt"],
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.getOptionsQuotes(params));
    }
  },
  "options-open-close": {
    desc: "Options open/close",
    usage: "--ticker O:AAPL230616C00150000 --date 2025-01-15 [--adjusted true]",
    handler: async (_api, f) => {
      const params = {
        optionsTicker: requireFlag(f, "ticker"),
        date: requireFlag(f, "date"),
        adjusted: bool(f.adjusted)
      };
      await output(api.getOptionsOpenClose(params));
    }
  },
  "options-chain": {
    desc: "Options chain",
    usage: "--underlying AAPL [--strike 150] [--expiration 2025-06-16] [--type call] [--limit 10] [--sort expiration] [--order asc]",
    handler: async (_api, f) => {
      const params = {
        underlyingAsset: requireFlag(f, "underlying"),
        strikePrice: num(f.strike),
        expirationDate: f.expiration,
        contractType: f.type,
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.getOptionsChain(params));
    }
  },
  "options-contract": {
    desc: "Options contract details",
    usage: "--underlying AAPL --contract O:AAPL230616C00150000",
    handler: async (_api, f) => {
      const params = {
        underlyingAsset: requireFlag(f, "underlying"),
        optionContract: requireFlag(f, "contract")
      };
      await output(api.getOptionContract(params));
    }
  },
  "options-previous": {
    desc: "Options previous day aggregates",
    usage: "--ticker O:AAPL230616C00150000 [--adjusted true]",
    handler: async (_api, f) => {
      const params = {
        optionsTicker: requireFlag(f, "ticker"),
        adjusted: bool(f.adjusted)
      };
      await output(api.getPreviousOptionsAggregates(params));
    }
  },
  "options-sma": {
    desc: "Options SMA",
    usage: "--ticker O:AAPL230616C00150000 [--timestamp 2025-01-01] [--timespan day] [--adjusted true] [--window 50] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        optionsTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getOptionsSMA(params));
    }
  },
  "options-ema": {
    desc: "Options EMA",
    usage: "--ticker O:AAPL230616C00150000 [--timestamp 2025-01-01] [--timespan day] [--adjusted true] [--window 50] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        optionsTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getOptionsEMA(params));
    }
  },
  "options-rsi": {
    desc: "Options RSI",
    usage: "--ticker O:AAPL230616C00150000 [--timestamp 2025-01-01] [--timespan day] [--adjusted true] [--window 14] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        optionsTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        window: num(f.window),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getOptionsRSI(params));
    }
  },
  "options-macd": {
    desc: "Options MACD",
    usage: "--ticker O:AAPL230616C00150000 [--timestamp 2025-01-01] [--timespan day] [--adjusted true] [--short-window 12] [--long-window 26] [--signal-window 9] [--series-type close] [--expand-underlying false] [--order asc] [--limit 10]",
    handler: async (_api, f) => {
      const params = {
        optionsTicker: requireFlag(f, "ticker"),
        timestamp: f.timestamp,
        timespan: f.timespan,
        adjusted: bool(f.adjusted),
        shortWindow: num(f["short-window"]),
        longWindow: num(f["long-window"]),
        signalWindow: num(f["signal-window"]),
        seriesType: f["series-type"],
        expandUnderlying: bool(f["expand-underlying"]),
        order: f.order,
        limit: num(f.limit)
      };
      await output(api.getOptionsMACD(params));
    }
  },
  "last-options-trade": {
    desc: "Last options trade",
    usage: "--ticker O:AAPL230616C00150000",
    handler: async (_api, f) => {
      const params = {
        optionsTicker: requireFlag(f, "ticker")
      };
      await output(api.getLastOptionsTrade(params));
    }
  }
};

// src/commands/reference.ts
var referenceCommands = {
  tickers: {
    desc: "List/search tickers",
    usage: "[--search apple] [--type CS] [--market stocks] [--exchange NYS] [--cusip ...] [--cik ...] [--date 2025-01-01] [--active true] [--limit 10] [--sort ticker] [--order asc]",
    handler: async (_api, f) => {
      const params = {
        ticker: f.ticker,
        type: f.type,
        market: f.market,
        exchange: f.exchange,
        cusip: f.cusip,
        cik: f.cik,
        date: f.date,
        search: f.search,
        active: bool(f.active),
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.listTickers(params));
    }
  },
  "ticker-details": {
    desc: "Ticker details",
    usage: "--ticker AAPL [--date 2025-01-01]",
    handler: async (_api, f) => {
      const params = {
        ticker: requireFlag(f, "ticker"),
        date: f.date
      };
      await output(api.getTicker(params));
    }
  },
  "ticker-types": {
    desc: "List ticker types",
    usage: "[--asset-class stocks] [--locale us]",
    handler: async (_api, f) => {
      const params = {
        assetClass: f["asset-class"],
        locale: f.locale
      };
      await output(api.listTickerTypes(params));
    }
  },
  exchanges: {
    desc: "List exchanges",
    usage: "[--asset-class stocks] [--locale us]",
    handler: async (_api, f) => {
      const params = {
        assetClass: f["asset-class"],
        locale: f.locale
      };
      await output(api.listExchanges(params));
    }
  },
  conditions: {
    desc: "List conditions",
    usage: "[--asset-class stocks] [--data-type trade] [--id 1] [--sip CTA] [--limit 10] [--sort name] [--order asc]",
    handler: async (_api, f) => {
      const params = {
        assetClass: f["asset-class"],
        dataType: f["data-type"],
        id: num(f.id),
        sip: f.sip,
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.listConditions(params));
    }
  },
  dividends: {
    desc: "List dividends",
    usage: "[--ticker AAPL] [--ex-dividend-date 2025-01-01] [--record-date 2025-01-01] [--declaration-date 2025-01-01] [--pay-date 2025-01-01] [--frequency 4] [--cash-amount 0.23] [--dividend-type CD] [--limit 10] [--sort ex_dividend_date] [--order asc]",
    handler: async (_api, f) => {
      const params = {
        ticker: f.ticker,
        exDividendDate: f["ex-dividend-date"],
        recordDate: f["record-date"],
        declarationDate: f["declaration-date"],
        payDate: f["pay-date"],
        frequency: num(f.frequency),
        cashAmount: num(f["cash-amount"]),
        dividendType: f["dividend-type"],
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.listDividends(params));
    }
  },
  "stock-splits": {
    desc: "List stock splits",
    usage: "[--ticker AAPL] [--execution-date 2025-01-01] [--reverse-split false] [--limit 10] [--sort execution_date] [--order asc]",
    handler: async (_api, f) => {
      const params = {
        ticker: f.ticker,
        executionDate: f["execution-date"],
        reverseSplit: bool(f["reverse-split"]),
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.listStockSplits(params));
    }
  },
  financials: {
    desc: "Company financials",
    usage: "[--ticker AAPL] [--cik ...] [--company-name ...] [--sic ...] [--filing-date 2025-01-01] [--period-of-report-date 2025-01-01] [--timeframe quarterly] [--include-sources false] [--limit 10] [--sort filing_date] [--order asc]",
    handler: async (_api, f) => {
      const params = {
        ticker: f.ticker,
        cik: f.cik,
        companyName: f["company-name"],
        sic: f.sic,
        filingDate: f["filing-date"],
        periodOfReportDate: f["period-of-report-date"],
        timeframe: f.timeframe,
        includeSources: bool(f["include-sources"]),
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.listFinancials(params));
    }
  },
  ipos: {
    desc: "List IPOs",
    usage: "[--ticker AAPL] [--us-code ...] [--isin ...] [--listing-date 2025-01-15] [--limit 10] [--sort listing_date] [--order asc]",
    handler: async (_api, f) => {
      const params = {
        ticker: f.ticker,
        usCode: f["us-code"],
        isin: f.isin,
        listingDate: f["listing-date"],
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.listIPOs(params));
    }
  },
  "related-companies": {
    desc: "Related companies",
    usage: "--ticker AAPL",
    handler: async (_api, f) => {
      const params = {
        ticker: requireFlag(f, "ticker")
      };
      await output(api.getRelatedCompanies(params));
    }
  }
};

// src/commands/market.ts
var marketCommands = {
  "market-status": {
    desc: "Current market status",
    usage: "",
    handler: async (_api, _f) => {
      await output(api.getMarketStatus());
    }
  },
  "market-holidays": {
    desc: "Upcoming market holidays",
    usage: "",
    handler: async (_api, _f) => {
      await output(api.getMarketHolidays());
    }
  }
};

// src/commands/news.ts
var newsCommands = {
  news: {
    desc: "Market news",
    usage: "[--ticker AAPL] [--published-utc 2025-01-01] [--ticker-gte AAPL] [--ticker-gt AAPL] [--ticker-lte AAPL] [--ticker-lt AAPL] [--published-utc-gte 2025-01-01] [--published-utc-gt 2025-01-01] [--published-utc-lte 2025-01-01] [--published-utc-lt 2025-01-01] [--limit 10] [--sort published_utc] [--order desc]",
    handler: async (_api, f) => {
      const params = {
        ticker: f.ticker,
        publishedUtc: f["published-utc"],
        tickerGte: f["ticker-gte"],
        tickerGt: f["ticker-gt"],
        tickerLte: f["ticker-lte"],
        tickerLt: f["ticker-lt"],
        publishedUtcGte: f["published-utc-gte"],
        publishedUtcGt: f["published-utc-gt"],
        publishedUtcLte: f["published-utc-lte"],
        publishedUtcLt: f["published-utc-lt"],
        order: f.order,
        limit: num(f.limit),
        sort: f.sort
      };
      await output(api.listNews(params));
    }
  }
};

// src/cli.ts
var COMMANDS = {
  ...stocksCommands,
  ...cryptoCommands,
  ...forexCommands,
  ...indicesCommands,
  ...optionsCommands,
  ...referenceCommands,
  ...marketCommands,
  ...newsCommands
};
function showHelp() {
  console.log(`polygon - Polygon/Massive Market Data CLI
`);
  console.log(`Usage: polygon <command> [options]
`);
  console.log("Commands:");
  const maxLen = Math.max(...Object.keys(COMMANDS).map((k) => k.length));
  const groups = {};
  for (const name of Object.keys(COMMANDS)) {
    const prefix = name.split("-")[0];
    if (!groups[prefix])
      groups[prefix] = [];
    groups[prefix].push(name);
  }
  const order = [
    "stocks",
    "crypto",
    "forex",
    "options",
    "indices",
    "last",
    "currency",
    "tickers",
    "ticker",
    "exchanges",
    "conditions",
    "dividends",
    "stock",
    "financials",
    "ipos",
    "related",
    "market",
    "news"
  ];
  for (const prefix of order) {
    if (groups[prefix]) {
      for (const name of groups[prefix]) {
        const { desc } = COMMANDS[name];
        console.log(`  ${name.padEnd(maxLen + 2)} ${desc}`);
      }
      console.log();
      delete groups[prefix];
    }
  }
  for (const prefix in groups) {
    for (const name of groups[prefix]) {
      const { desc } = COMMANDS[name];
      console.log(`  ${name.padEnd(maxLen + 2)} ${desc}`);
    }
  }
  console.log("Use 'polygon <command> --help' for command-specific options.");
  console.log("Set POLY_API_KEY in .env or environment.");
}
function showCommandHelp(command) {
  const cmd = COMMANDS[command];
  if (!cmd) {
    console.error(`Unknown command: ${command}`);
    console.error("Run 'polygon help' to see available commands.");
    process.exit(1);
  }
  console.log(`${command} - ${cmd.desc}`);
  console.log(`
Usage: polygon ${command} ${cmd.usage}`);
}
async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (command === "help" || command === "--help" || command === "-h") {
    showHelp();
    return;
  }
  if (flags.help === "true") {
    showCommandHelp(command);
    return;
  }
  const cmd = COMMANDS[command];
  if (!cmd) {
    console.error(`Unknown command: ${command}`);
    console.error("Run 'polygon help' to see available commands.");
    process.exit(1);
  }
  try {
    await cmd.handler(api, flags);
  } catch (e) {
    console.error("Error executing command:", e.message ?? e);
    process.exit(1);
  }
}
main();
