if (typeof navigator !== 'undefined') {
  var browserInfo = (function () {
    var ua = navigator.userAgent;

    var match =
      /(Opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
      /(OPR)[ \/]([\w.]+)/.exec(ua) ||
      /(Edge)[ \/]([\w.]+)/.exec(ua) ||
      /(MSIE) ([\w.]+)/.exec(ua) ||
      /(Chrome)[ \/]([\w.]+)/.exec(ua) ||
      /Version[ \/]([\w.]+) (Safari)/.exec(ua) ||
      /(Safari)[ \/]([\w.]+)/.exec(ua) ||
      /(Firefox)[ \/]([\w.]+)/.exec(ua) ||
      ua.indexOf('compatible') < 0 &&
      /(Mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
      [];

    if (match[2] === 'Safari') {
      return {
        browser: match[2],
        version: match[1]
      };
    } else {
      return {
        browser: match[1] || '',
        version: match[2] || '0'
      };
    }
  })();

  var isWebkit = function () {
    return browserInfo.name === 'Chrome' || browserInfo.name === 'Safari';
  }

  var platformInfo = (function () {
    var ua = navigator.userAgent;

    var match =
      /(Windows NT) ([\w.]+)/.exec(ua) ||
      /(Mac OS X) ([\w.]+)/.exec(ua) ||
      /(CrOS) \w+ ([\w.]+)/.exec(ua) ||
      /(iPhone); .* OS ([\d_]+)/.exec(ua) ||
      /(iPad); .* OS ([\d_]+)/.exec(ua);

    var name = 'unknown';
    var version = '';

    if (match) {
      name = match[1];
      version = match[2];
    } else {
      var PLATFORMS = ['Android', 'iPhone', 'iPad', 'Windows', 'Macintosh', 'Linux', 'CrOs', 'NetBSD', 'OpenBSD', 'FreeBSD'];

      for (var i = 0; i < PLATFORMS.length; i++) {
        if (ua.indexOf(PLATFORMS[i]) !== -1) {
          name = PLATFORMS[i];
        }
      }
    }

    return {
      name: name,
      version: version
    };
  })();
}

  var openUrl = function(url) {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  var setIcon = function(id) {
    var bitmap = bitmapMap.get(id);

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    drawImage(ctx, bitmap, 0, 0);

    var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = canvas.toDataURL('image/png');
    document.getElementsByTagName('head')[0].appendChild(link);
  };

  var displayScaleFactor = null;

  var getDisplayScaleFactor = function () {
    if (displayScaleFactor === null) {
      displayScaleFactor = window.devicePixelRatio >= 1.5 ? 2.0 : 1.0;
    }
    return displayScaleFactor;
  };

  /* wxNonOwnedWindow */

  var nextWindowId = 0;
  var windowMap = new Map();

  var createWindow = function (id, needsCanvas, isVisible, classList) {
    //console.log('createWindow: ' + id + ' ' + needsCanvas + ' ' + isVisible);

    if (id === -1) {
      id = nextWindowId++;
    }
    
    var window = null;
    var canvas = null;

    if (id === 0) {
      window = document.getElementById('main-window');
      canvas = document.getElementById('canvas');
    } else {
      window = document.createElement('div');
      window.className = classList;
      window.id = 'window-' + id;
      window.style.display = isVisible ? 'block' : 'none';

      if (needsCanvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'window-canvas';
        window.appendChild(canvas);
      }

      document.getElementById('window-container').appendChild(window);
    }

    windowMap.set(id, {
      window: window,
      canvas: canvas,
      width: 0,
      height: 0,
      imageData: null,
      context: null
    });

    return id;
  };

  var destroyWindow = function (id) {
    var windowData = windowMap.get(id);

    document.getElementById('window-container').removeChild(windowData.window);
    windowMap.delete(id);
  };

  var setWindowVisibility = function (id, isVisible) {
    //console.log('setWindowVisibility: ' + id + ': ' + isVisible);

    var windowData = windowMap.get(id);
    windowData.window.style.display = isVisible ? 'block' : 'none';
  };

  var setWindowRect = function (id, x, y, width, height) {
    //console.log('setWindowRect: ' + id + ' (' + x + ', ' + y + ', ' + width + ', ' + height + ')');

    var windowData = windowMap.get(id);

    var header = document.getElementsByClassName('header')[0];
    var headerHeight = header ? header.offsetHeight : 0;

    var window = windowData.window;
    window.style.left = x + 'px';
    window.style.top = y + headerHeight + 'px';
    window.style.width = width + 'px';
    window.style.height = height + 'px';

    var canvas = windowData.canvas;

    if (canvas) {
      var scaleFactor = getDisplayScaleFactor();

      canvas.width = width * scaleFactor;
      canvas.height = height * scaleFactor;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      windowData.width = canvas.width;
      windowData.height = canvas.height;

      if (windowData.width > 0 && windowData.height > 0) {
        windowData.imageData = new ImageData(windowData.width, windowData.height);
      } else {
        windowData.imageData = null;
      }

      var ctx = canvas.getContext('2d');
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.imageSmoothingEnabled = false;
      ctx.textBaseline = 'alphabetic';
      ctx.depth = 0;
      ctx.stack = [];

      windowData.context = ctx;
    }
  };

  var setWindowZIndex = function (id, zIndex) {
    //console.log('setWindowZIndex: ' + id + ': ' + zIndex);

    var windowData = windowMap.get(id);
    windowData.window.style.zIndex = zIndex;
  };

  var raiseWindow = function (id) {
    var maxZ = 0;

    for (const windowId of windowMap.keys()) {
      var windowData = windowMap[windowId];
      if (windowId !== id && windowData) {
        var style = document.defaultView.getComputedStyle(windowData.window);
        var zIndex = parseInt(style.getPropertyValue('z-index'), 10);
        if (!isNaN(zIndex)) {
          maxZ = Math.max(maxZ, zIndex);
        }
      }
    }

    setWindowZIndex(id, maxZ + 1);
  };

  var lowerWindow = function (id) {
    var minZ = 0;

    for (const windowId of windowMap.keys()) {
      var windowData = windowMap[windowId];
      if (windowId !== id && windowData) {
        var style = document.defaultView.getComputedStyle(windowData.window);
        var zIndex = parseInt(style.getPropertyValue('z-index'), 10);
        if (!isNaN(zIndex)) {
          minZ = Math.min(minZ, zIndex);
        }
      }
    }

    setWindowZIndex(id, minZ - 1);
  };

  /* wxColour */

  var formatHexString = function (n) {
    var hexString = n.toString(16);
    while (hexString.length < 8) {
      hexString = '0' + hexString;
    }
    return hexString;
  };

  var makeColorString = function (color) {
    var a = (color >> 24) & 0xff;
    var b = (color >> 16) & 0xff;
    var g = (color >> 8) & 0xff;
    var r = color & 0xff;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a / 255.0 + ')';
    //return '#' + formatHexString(color);
  };

  /* wxBitmap */

  var nextBitmapId = 0;
  var bitmapMap = new Map();

  var createBitmap = function (x, y, width, height, data, scaleFactor) {
    //console.log('setWindowImageData: ' + id + ': ' + '(' + x + ', ' + y + ') ' + width + 'x' + height);

    var id = nextBitmapId++;    
    setBitmapData(id, x, y, width, height, data, scaleFactor);

    return id;
  };

  var destroyBitmap = function (id) {
    bitmapMap.delete(id);
  };

  var getBitmapData = function (id, data) {
    var bitmap = bitmapMap.get(id);

    var imageData;

    if (bitmap.context) {
      imageData = bitmap.context.getImageData(0, 0, bitmap.width, bitmap.height);
      bitmap.context = null;
    } else {
      imageData = bitmap.imageData;
    }

    bitmap.imageBitmap = null;

    Module.HEAPU8.set(imageData.data, data);
  };

  var setBitmapData = function (id, width, height, data, scaleFactor) {
    var size = 4 * width * height;
    var array = new Uint8ClampedArray(Module.HEAPU8.buffer, data, size);
    var imageData = new ImageData(width, height);  
    imageData.data.set(array);

    var bitmap = {
      data: data,
      size: size,
      width: width,
      height: height,
      scaleFactor: scaleFactor,
      imageData: imageData,
      imageBitmap: null,
      context: null
    };

    bitmapMap.set(id, bitmap);

    createImageBitmap(imageData, 0, 0, width, height).then(function (imageBitmap) {
      // TODO: fix race condition
      var bitmap = bitmapMap.get(id);
      if (bitmap && !bitmap.context) {
        bitmap.imageBitmap = imageBitmap;
      }
    })
  };

  /* wxDC */

  var nextContextId = 0;
  var contextMap = new Map();

  var createOffscreenContext = function (width, height) {
    var canvas = null;

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
    } else if (typeof document !== 'undefined' && 'createElement' in document) {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }

    if (canvas !== null) {
        var ctx = canvas.getContext('2d');
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.imageSmoothingEnabled = false;
        ctx.textBaseline = 'alphabetic';
        return ctx;
    } else {
        return null;
    }
  };

  var offscreenContext = createOffscreenContext(1, 1);

  var pushContext = function (ctx) {
    var saveCtx = {
      x: ctx.x,
      y: ctx.y,
      width: ctx.width,
      height: ctx.height,
      scaleFactor: ctx.scaleFactor,
      isInitialized: ctx.isInitialized
    };

    if (ctx.isInitialized) {
      saveCtx.font = ctx.font,
      saveCtx.lineWidth = ctx.lineWidth,
      saveCtx.lineJoin = ctx.lineJoin,
      saveCtx.lineCap = ctx.lineCap,
      saveCtx.fillStyle = ctx.fillStyle,
      saveCtx.strokeStyle = ctx.strokeStyle
      saveCtx.dashCount = ctx.dashCount;

      if (saveCtx.dashCount > 0) {
        saveCtx.setLineDash(ctx.getLineDash());
      }

      ctx.restore();
      ctx.save();
    }

    ctx.stack.push(saveCtx);
  };

  var popContext = function (ctx) {
    var restoreCtx = ctx.stack.pop();

    ctx.x = restoreCtx.x;
    ctx.y = restoreCtx.y;
    ctx.width = restoreCtx.width;
    ctx.height = restoreCtx.height;
    ctx.scaleFactor = restoreCtx.scaleFactor;
    ctx.isInitialized = restoreCtx.isInitialized;

    if (ctx.isInitialized) {
      ctx.restore();
      ctx.save();

      ctx.font = restoreCtx.font;
      ctx.lineWidth = restoreCtx.lineWidth;
      ctx.lineJoin = restoreCtx.lineJoin;
      ctx.lineCap = restoreCtx.lineCap;
      ctx.fillStyle = restoreCtx.fillStyle;
      ctx.strokeStyle = restoreCtx.strokeStyle;
      ctx.dashCount = restoreCtx.dashCount;

      if (ctx.dashCount > 0) {
        ctx.setLineDash(restoreCtx.getLineDash());
      }

      // TODO: save/restore clip
      ctx.beginPath();
      ctx.rect(0, 0, ctx.width, ctx.height);
      ctx.clip();
    }
  };

  var createWindowContext = function (windowId, x, y, width, height, scaleFactor) {
    var id = nextContextId++;
    //console.log('createWindowContext: ' + windowId + ' ' + x + ' ' + y + ' ' + width + ' ' + height);

    var windowData = windowMap.get(windowId);
    var ctx = windowData.context;

    if (ctx.depth > 0) {
      pushContext(ctx);
    }

    ctx.x = x;
    ctx.y = y;
    ctx.width = width;
    ctx.height = height;
    ctx.scaleFactor = scaleFactor;
    ctx.isInitialized = false;
    ctx.depth++;

    contextMap.set(id, ctx);

    return id;
  };

  var destroyWindowContext = function (id) {
    var ctx = contextMap.get(id); 

    if (ctx.isInitialized) {
      ctx.restore();
    }

    if (ctx.depth > 1) {
      popContext(ctx);
    }

    ctx.depth--;

    //console.log('destroyContext: ' + id + ' ' + ctx.width + ' ' + ctx.height);
    contextMap.delete(id);
  };

  var createMemoryContext = function (bitmapId, scaleFactor) {
    var contextId = nextContextId++;
    var bitmap = bitmapMap.get(bitmapId);

    var ctx = createOffscreenContext(bitmap.width, bitmap.height);

    ctx.x = 0;
    ctx.y = 0;
    ctx.width = bitmap.width / scaleFactor;
    ctx.height = bitmap.height / scaleFactor;
    ctx.scaleFactor = scaleFactor;
    ctx.dashCount = 0;
    ctx.isInitialized = true;
    ctx.depth = 0;
    ctx.stack = [];

    ctx.scale(scaleFactor, scaleFactor);

    contextMap.set(contextId, ctx);

    drawImage(ctx, bitmap, 0, 0);

    bitmap.imageData = null;
    bitmap.imageBitmap = null;
    bitmap.context = ctx;

    return contextId;
  };

  var destroyMemoryContext = function (contextId) {
    //console.log('deselectBitmap: ' + contextId);
    contextMap.delete(contextId);
  };

  var getContext = function (id) {
    var ctx = contextMap.get(id);

    if (!ctx.isInitialized) {
      // scale and translate(x, y)
      var x = ctx.x;
      var y = ctx.y;
      var scaleFactor = ctx.scaleFactor;


      ctx.setTransform(scaleFactor, 0, 0, scaleFactor, scaleFactor * x, scaleFactor * y);

      ctx.save();

      ctx.beginPath();
      ctx.rect(0, 0, ctx.width, ctx.height);
      ctx.clip()

      ctx.dashCount = 0;
      ctx.isInitialized = true;
    }

    return ctx;
  };

  var setFont = function (id, font) {
    var ctx = getContext(id);
    ctx.font = font;
  };

  var createPattern = function (contextId, bitmapId) {
    var ctx = getContext(contextId);
    var bitmap = bitmapMap.get(bitmapId);
    var source;

    if (bitmap.imageBitmap) {
      source = bitmap.imageBitmap;
    } else if (bitmap.context) {
      source = bitmap.context.canvas;
    } else {
      offscreenContext.canvas.width = bitmap.width;
      offscreenContext.canvas.height = bitmap.height;
      offscreenContext.putImageData(bitmap.imageData, 0, 0);
      source = offscreenContext.canvas;
    }

    return ctx.createPattern(source, 'repeat');
  };

  var setBrush = function (contextId, color, bitmapId) {
    var ctx = getContext(contextId);

    if (bitmapId === -1 || typeof bitmapId === 'undefined') {
      ctx.fillStyle = makeColorString(color);
    } else {
      ctx.fillStyle = createPattern(contextId, bitmapId);
    }
  };

  var lineJoinMap = [
    'round',
    'bevel',
    'miter'
  ];

  var lineCapMap = [
    'butt',
    'round',
    'square'
  ];

  var setPen = function (contextId, color, lineWidth, lineJoin, lineCap, dashCount, dashPtr, bitmapId) {
    var ctx = getContext(contextId);

    ctx.lineWidth = lineWidth;
    ctx.lineJoin = lineJoinMap[lineJoin];
    ctx.lineCap = lineCapMap[lineCap];

    if (bitmapId === -1 || typeof bitmapId === 'undefined') {
      ctx.strokeStyle = makeColorString(color);
    } else {
      ctx.strokeStyle = createPattern(contextId, bitmapId);
    }

    ctx.dashCount = dashCount;
    var dashes = [];
    for (var i = 0; i < dashCount; i++) {
      dashes.push(Module.HEAP8[dashPtr + i]);
    }
    ctx.setLineDash(dashes);
  };

  var resetClip = function (ctx) {
    var font = ctx.font;
    var lineWidth = ctx.lineWidth;
    var lineJoin = ctx.lineJoin;
    var lineCap = ctx.lineCap;
    var fillStyle = ctx.fillStyle;
    var strokeStyle = ctx.strokeStyle;

    ctx.restore();
    ctx.save();

    ctx.font = font;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = lineJoin;
    ctx.lineCap = lineCap;
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
  };

  var clipRect = function (id, x, y, width, height) {
    //console.log('clipRect: ' + x + ' ' + y + ' ' + width + ' ' + height);
    var ctx = getContext(id);

    resetClip(ctx);

    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
  };

  var destroyClip = function (id) {
    var ctx = getContext(id);

    resetClip(ctx);

    ctx.beginPath();
    ctx.rect(0, 0, ctx.width, ctx.height);
    ctx.clip();
  };

  var clearRect = function (id, width, height, color) {
    var ctx = getContext(id);

    var saveFillStyle = ctx.fillStyle;
    ctx.fillStyle = makeColorString(color);
    // TODO: save/restore clip

    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = saveFillStyle;
  };

  var drawRect = function (id, x, y, width, height, fill, stroke) {
    var ctx = getContext(id);

    if (fill) {
      ctx.fillRect(x, y, width, height);
    }

    if (stroke) {
      ctx.strokeRect(x, y, width, height);
    }
  };

  var drawRoundedRect = function (id, x, y, width, height, radius, fill, stroke) {
    var ctx = getContext(id);

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();

    if (fill) {
      ctx.fill();
    }

    if (stroke) {
      ctx.stroke();
    }
  };

  var drawEllipse = function (id, x, y, width, height, fill, stroke) {
    var ctx = getContext(id);

    var radiusX = width / 2.0; 
    var radiusY = height / 2.0;
    var cx = x + radiusX;
    var cy = y + radiusY 

    ctx.beginPath();
    ctx.ellipse(cx, cy, radiusX, radiusY, 0.0, 0.0, 2 * Math.PI);

    if (fill) {
      ctx.fill();
    }

    if (stroke) {
      ctx.stroke();
    }
  };

  var drawArc = function (id, x, y, radius, startAngle, endAngle, fill, stroke) {
    var ctx = getContext(id);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, startAngle, endAngle, true);

    if (fill) {
      ctx.fill();
    }

    if (stroke) {
      ctx.stroke();
    }
  };

  var drawEllipticArc = function (id, x, y, width, height, startDegrees, endDegrees, fill, stroke) {
    var ctx = getContext(id);

    var radiusX = width / 2.0;
    var radiusY = height / 2.0;
    var cx = x + radiusX;
    var cy = y + radiusY;
    var startRadians = -startDegrees * (Math.PI / 180.0);
    var endRadians = -endDegrees * (Math.PI / 180.0);

    if (fill) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0.0, startRadians, endRadians, true);
      ctx.lineTo(cx, cy);
      ctx.fill();
    }

    if (stroke) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0.0, startRadians, endRadians, true);
      ctx.stroke();
    }
  };

  var drawPoint = function (id, x, y) {
    var ctx = getContext(id);
    ctx.strokeRect(x, y, 1e-6, 1e-6);
  };

  var drawLine = function (id, x1, y1, x2, y2) {
    var ctx = getContext(id);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    ctx.stroke();
  };

  var drawLines = function (id, n, ptr) {
    var ctx = getContext(id);

    if (n > 0) {
      var index = ptr >> 2;
      var x = Module.HEAP32[index++];
      var y = Module.HEAP32[index++];

      ctx.beginPath();
      ctx.moveTo(x, y);

      for (var i = 1; i < n; i++) {
        x = Module.HEAP32[index++]; 
        y = Module.HEAP32[index++];
        ctx.lineTo(x, y);
      }

      ctx.stroke();
    } 
  };

  var drawPolygon = function (id, n, ptr, fillEvenOdd, fill, stroke) {
    var ctx = getContext(id);

    if (n > 0) {
      var index = ptr >> 2;
      var x = Module.HEAP32[index++];
      var y = Module.HEAP32[index++];

      ctx.beginPath();
      ctx.moveTo(x, y);

      for (var i = 1; i < n; i++) {
        x = Module.HEAP32[index++]; 
        y = Module.HEAP32[index++];
        ctx.lineTo(x, y);
      }

      ctx.closePath();

      if (fill) {
        ctx.fill(fillEvenOdd ? 'evenodd' : 'nonzero');
      }

      if (stroke) {
        ctx.stroke();
      }
    } 
  };

  var drawImage = function (ctx, bitmap, x, y) {
    var w = bitmap.width;
    var h = bitmap.height;
    var sf = bitmap.scaleFactor;
    var source;

    // console.log('drawImage: ' + bitmap.id + ' ' + x + ' ' + y + ' ' + w + ' ' + h + ' ' + sf);

    if (bitmap.imageBitmap) {
      source = bitmap.imageBitmap;
    } else if (bitmap.context) {
      source = bitmap.context.canvas;
    } else {
      offscreenContext.canvas.width = bitmap.width;
      offscreenContext.canvas.height = bitmap.height;
      offscreenContext.putImageData(bitmap.imageData, 0, 0);
      source = offscreenContext.canvas;
    }

    if (bitmap.scaleFactor == 1.0) {
      ctx.drawImage(source, x, y);
    } else {
      var sf = 1.0 / bitmap.scaleFactor;
      ctx.drawImage(source, 0, 0, w, h, x, y, w * sf, h * sf);
    }
  };

  var drawBitmap = function (contextId, bitmapId, x, y) {
    var ctx = getContext(contextId);
    var bitmap = bitmapMap.get(bitmapId);

    //console.log('drawBitmap: ' + contextId + ' ' + bitmapId + ' (' + x + ', ' + y + ')' + ' (' + bitmap.width + ', ' + bitmap.height + ')');

    drawImage(ctx, bitmap, x, y);
  };

  var blit = function (srcId, dstId, sx, sy, width, height, dx, dy) {
    var srcCtx = getContext(srcId);
    var dstCtx = getContext(dstId);

    //console.log('blit: ' + sx + ' ' + sy + ' ' + dx + ' ' + dy + ' ' + width + ' ' + height + ' ' + srcCtx.scaleFactor + ' ' + dstCtx.scaleFactor);

    var sf = srcCtx.scaleFactor
    dstCtx.drawImage(srcCtx.canvas, sx * sf, sy * sf, width * sf, height * sf, dx, dy, width, height);
  };

  var drawText = function (id, text, x, y, textColor) {
    var ctx = getContext(id);
    //console.log('drawText: ' + text + ' ' + id + ' ' + ctx.width + ' ' + ctx.height);
    
    var fillStyle = ctx.fillStyle;

    ctx.fillStyle = makeColorString(textColor);
    ctx.fillText(text, x, y);

    ctx.fillStyle = fillStyle;
  };

  var measureText = function (text, font) {
    offscreenContext.font = font;

    var textMetrics = offscreenContext.measureText(text);
    return Math.round(textMetrics.width);
  };

  var rotateAtPoint = function (id, x, y, angle) {
    var ctx = getContext(id);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-angle * (Math.PI / 180.0));
  };

  var clearRotation = function (id) {
    var ctx = getContext(id);
    ctx.restore();
  };

  /* wxCursor */

  var cursorMap = [
    'default',
    'crosshair',
    'hand',
    'text',
    'wait',
    'help',
    'e-resize',
    'n-resize',
    'ne-resize',
    'nw-resize',
    's-resize',
    'se-resize',
    'sw-resize',
    'w-resize',
    'ns-resize',
    'ew-resize',
    'nesw-resize',
    'nwse-resize',
    'col-resize',
    'row-resize',
    'move',
    'vertical-text',
    'cell',
    'context-menu',
    'alias',
    'progress',
    'no-drop',
    'copy',
    'none',
    'not-allowed',
    'zoom-in',
    'zoom-out',
    'grab',
    'grabbing'
  ];

  var setCursor = function (cursorIndex, bitmapId, hotSpotX, hotSpotY) {
    if (cursorIndex >= 0 && cursorIndex < cursorMap.length) {
      var cursor = cursorMap[cursorIndex];
      if (cursor.startsWith('grab') && isWebkit()) {
        cursor = '-webkit-' + cursor;
      }
      Module.canvas.style.cursor = cursor;
    } else {
      var bitmap = bitmapMap.get(bitmapId);

      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      drawImage(ctx, bitmap, 0, 0);
      var dataUrl = 'url(' + canvas.toDataURL('image/png') + ')';

      Module.canvas.style.cursor = dataUrl + ' ' + hotSpotX + ' ' + hotSpotY + ', auto';
    }
  };

  var showFullscreen = function (enable) {
    if (enable) {
      if (document.body.requestFullscreen) {
        document.body.requestFullscreen();
      } else if (document.body.webkitRequestFullscreen()) {
        document.body.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  var showFileDialog = function (multiple) {
    var input = document.createElement('input');
    if (multiple) {
      input.setAttribute('multiple', '');
    }
    input.type = 'file';
    input.onchange = function () {
      for (var i = 0; i < input.files.length; i++) {
        var file = input.files[i];
        console.log('file selected: ' + file.name);
        file.arrayBuffer().then(function (arrayBuffer) {
          var array = new Uint8Array(arrayBuffer);
          var path = '/tmp/' + file.name;

          var stream = FS.open(path, 'w+');
          var retCode = 0;

          if (stream) {
            FS.write(stream, array, 0, file.size);
            FS.close(stream);
          } else {
            retCode = 1;
          }

          ccall('OpenFileCallback', 'void', ['string', 'number'], [path, retCode]);
        });
      }
    };
    input.click();
  };

  var downloadFile = function (filename, size, data) {
    var link = document.createElement('a');

    var sharedArray = new Uint8Array(Module.HEAPU8.buffer, data, size);
    // Blob fails when passed SharedArrayBuffer
    var array = new Uint8Array(sharedArray);
    var blob = new Blob([array], {type: 'application/octet-stream'});

    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  var endModal = null;
/*
  var startModal = async function () {
    Asyncify.handleAsync(async () => {
      console.log('startModal');
      const result = await new Promise((resolve, reject) =>  {
        endModal = resolve;
      });
      console.log('modal result: ' + result);
    });
  };
 */

  /* wxLocalStorageConfig */

  var hasConfigEntry = function (key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  var hasConfigGroup = function (key) {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i).startsWith(key)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  var getConfigEntryCount = function (prefix, recurse) {
    var entryCount = 0;

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          var end = key.indexOf('/', prefix.length);
          if (end == -1 || recurse) {
            ++entryCount;
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
    return entryCount;
  };

  var getConfigEntryIndex = function (prefix, index) {
    var entryCount = 0;

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          var end = key.indexOf('/', prefix.length);
          if (end == -1) {
            if (entryCount >= index) {
              return i;
            } else {
              ++entryCount;
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
    return -1;
  };

  var getConfigGroupCount = function (prefix, recurse) {
    var children = new Set();

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          var end = key.indexOf('/', prefix.length);
          if (end != -1) {
            if (recurse) {
              end = key.lastIndexOf('/');
            }
            var child = key.substring(prefix.length, end);
            if (!children.has(child)) {
              children.add(child);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
    return children.size;
  };

  var getConfigGroupIndex = function (prefix, index) {
    var children = new Set();

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          var end = key.indexOf('/', prefix.length);
          if (end != -1) {
            var child = key.substring(prefix.length, end);
            if (!children.has(child)) {
              if (children.size >= index) {
                return i;
              } else {
                children.add(child);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
    return -1;
  };

  var getConfigKeyLength = function (index) {
    try {
      return localStorage.key(index).length;
    } catch (error) {
      console.error(error);
      return 0;
    }
  };

  var getConfigKey = function (index, keyBuffer, length) {
    try {
      var key = localStorage.key(index);
      stringToUTF8(key, keyBuffer, length);
    } catch (error) {
      console.error(error);
    }
  };

  var getConfigEntryLength = function (key) {
    var value = null;
    try {
      value = localStorage.getItem(key);
    } catch (error) {
      //console.error(error);
    }

    if (value === null) {
      return -1;
    } else {
      return value.length
    }
  };

  var getConfigEntry = function (key, valueBuffer, length) {
    try {
      var value = localStorage.getItem(key);
      if (value !== null) {
        stringToUTF8(value, valueBuffer, length);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  var setConfigEntry = function (key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(error);
    }
  };

  var removeConfigEntry = function (key) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(error);
      }
  };

  var removeConfigGroup = function (group) {
    try {
      var keysToRemove = [];

      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(group)) {
          keysToRemove.push(key);
        }
      }
      for (var i = 0; i < keysToRemove.length; i++) {
        localStorage.removeItem(keysToRemove[i]);
      }
      return keysToRemove.length > 0;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  var clearConfig = function () {
    try {
      localStorage.clear();
    } catch (error) {
      console.error(error);
    }
  };

  var renameConfigGroup = function (oldGroup, newGroup) {
    try {
      var keysToRename = [];

      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(oldGroup)) {
          keysToRename.push(key);
        } else if (key.startsWith(newGroup)) {
          return false;
        }
      }

      if (keysToRename.length > 0) {
        for (var i = 0; i < keysToRename.length; i++) {
          var oldKey = keysToRename[i];
          var newKey = newGroup + oldKey.substring(oldGroup.length);

          var value = localStorage.getItem(oldKey);
          localStorage.setItem(newKey, value);
          localStorage.removeItem(oldKey);
        }
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }

  };

