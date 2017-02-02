// Hack to handle vendor prefixes
navigator.getUserMedia = ( navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);

window.requestAnimFrame = (function () {
    return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function (callback, element) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

window.AudioContext = (function () {
    return  window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
})();

// Global Variables for Audio
var audioContext;
var analyserNode;
var javascriptNode;
var amplitudeArray;     // array to hold frequency data
var audioStream;
var redrawRow = 0;
var redrawColumn = 0;


var config = {
    sampleSize: 4096 * .25,       // number of samples to collect before analyzing
    // decreasing this gives a faster sonogram, increasing it slows it down
    gridStep: 50,          // canvas grid x and y steps
    canvasWidth: 1000,      // needs to be in lockstep with css value at the time the canvas object is created

    canvasHeight: 700,     //     otherwise the circles are scaled strangely
    wobbleFactor: 50,      // moves the center of the circles within a random orbit around the grid points of the canvas
    circleMax: 100,        // maximum size of a circle
    circleMin: 1,          // minimum size of a circle
    amplitudeMax: 300,     // what the maximum amplitude might be
    amplitudeMin: 0.0,     // what the minimum amplitude might be
    transparency: 0.75,   // the transparency of the circles
    drawComplex: false,   // use the complex shape
    complexScaler: 3,    // how much bigger complex shape is than circles
    useGrid: true,
    addScaled: false,     // copy the scaled image to the top corner for each cycle.
    // functions to calculate various things below including the wobble of the positioning of the circles,
    //  the radius of the circles
    // and the color of the circles.
    wobble: function () {
        return Math.floor(Math.random() * config.wobbleFactor) - Math.floor(config.wobbleFactor / 2);
    },
    randomX: function() { return Math.floor(Math.random() *  config.canvasWidth); },
    randomY: function() { return Math.floor(Math.random() *  config.canvasHeight); },
    amplitudeRange: function () {
        return config.amplitudeMax - config.amplitudeMin;
    },
    circleRange: function () {
        return config.circleMax - config.circleMin;
    },
    scaler: function () {
        return config.circleRange() / config.amplitudeRange();
    },
    radiusFromAmplitudeArray: function (amplitudeArray) {
        var max = 0;
        var min = 99999;
        for (var i = 0; i < amplitudeArray.length; i++) {
            max = max < amplitudeArray[i] ? amplitudeArray[i] : max;
            min = min > amplitudeArray[i] ? amplitudeArray[i] : min;
        }

        var diff = Math.abs(max - min);
        var radius = config.scaleRadius(diff);

        //console.log ("min: " + min + " max: " + max + " diff: " + diff +  " radius: " + radius);
        return Math.abs(radius);
    },
    scaleRadius: function (r) {
        return config.scaler() * (r - config.amplitudeMin) + config.circleMin;
    },
    randomColor: function () {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    },
    center: function(arr, centerX, centerY) {
        new_arr = [];
        arr_len = arr.length;
        idx = 0;
        while (idx < arr_len-1) {
            new_arr[idx] = Math.floor(centerX - arr[idx]);
            new_arr[idx+1] = Math.floor(centerY - arr[idx+1]);
            idx = idx + 2;
        }
        return new_arr;
    },
    scale_a: function(arr, radius) {
        return $(arr).map(function(i,n){
            return Math.floor(n * radius);
        });
    }
}

// Global Variables for Drawing
var column = 30;
var row = 30;

var ctx;

$(document).ready(function () {
    ctx = $("#canvas").get()[0].getContext("2d");
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);  // sets the canvas background to white
    ctx.globalAlpha = config.transparency;       // sets the transparency level of the drawings.

    try {
        audioContext = new AudioContext();
    } catch (e) {
        alert('Web Audio API is not supported in this browser');
    }

    // When the Start button is clicked, finish setting up the audio nodes, and start
    // processing audio streaming in from the input device
    $("#start_button").click(function (e) {
        e.preventDefault();

        // get the input audio stream and set up the nodes
        try {
            navigator.getUserMedia(
                { video: false,
                    audio: true},
                setupAudioNodes,
                onError);
        } catch (e) {
            alert('webkitGetUserMedia threw exception :' + e);
        }
    });

    // Stop the audio processing
    $("#stop_button").click(function (e) {
        e.preventDefault();
        javascriptNode.onaudioprocess = null;
        if (audioStream) {
            var track = audioStream.getTracks()[0];
            track.stop();
        }
        if (sourceNode)  sourceNode.disconnect();
    });
});

function setupAudioNodes(stream) {
    // create the media stream from the audio input source (microphone)
    sourceNode = audioContext.createMediaStreamSource(stream);
    audioStream = stream;

    analyserNode = audioContext.createAnalyser();
    javascriptNode = audioContext.createScriptProcessor(config.sampleSize, 1, 1);

    // Create the array for the data values
    amplitudeArray = new Uint8Array(analyserNode.frequencyBinCount);

    // setup the event handler that is triggered every time enough samples have been collected
    // trigger the audio analysis and draw one column in the display based on the results
    javascriptNode.onaudioprocess = function () {

        amplitudeArray = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteTimeDomainData(amplitudeArray);

        // draw one value onto the display
        requestAnimFrame(drawTimeDomain);
    }

    // Now connect the nodes together
    // Do not connect source node to destination - to avoid feedback
    sourceNode.connect(analyserNode);
    analyserNode.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
}

function onError(e) {
    console.log(e);
}

function drawTimeDomain() {

    var centerX = column + config.wobble();
    var centerY = row + config.wobble();

    if (!config.useGrid)
    {
       centerX = config.randomX();
        centerY = config.randomY();
    }

    var radius = config.radiusFromAmplitudeArray(amplitudeArray);

    if (config.drawComplex) {
        drawComplexShape(centerX, centerY, radius, config.randomColor());
    }
    else {
        drawCircle(centerX, centerY, radius, config.randomColor());
    }



    // loop around the canvas when we reach the end
    column += config.gridStep;
    if (column >= config.canvasWidth) {
        column = 30;
        row += config.gridStep;
        if (row >= config.canvasHeight) {
            if (config.addScaled)
                redraw();
            column = redrawColumn;
            row = redrawRow;
        }

    }
}

function drawCircle(centerX, centerY, radius, fillStyle) {
    //draw a circle on the canvas grid including the wobble
    var saveStyle = ctx.fillStyle;
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    ctx.fill();
    ctx.fillStyle = saveStyle;
}

function drawComplexShape(centerX, centerY, radius, fillStyle) {
    radius = radius * config.complexScaler;
    var saveStyle = ctx.fillStyle;
    ctx.fillStyle = fillStyle;
    var start = [0.595,0.1];
    var steps = [
        [0.795,0,0.795,-0.25,0.295,-0.25],
        [0.195,-0.4,-0.155,-0.4,-0.255,-0.25],
        [-0.655,-0.25,-0.655,-0.1,-0.505,0],
        [-0.705,0.3,-0.405,0.35,-0.255,0.25],
        [-0.155,0.475,0.195,0.4,0.195,0.25],
        [0.445,0.475,0.695,0.4,0.595,0.1],
        [0.795,0.475,0.795,0.4,0.595,0.25],
        [-0.705,-0.4,-0.655,-0.4,-0.505,-0.25]
    ];
    var scaled_steps = steps;
    var scaled_steps = $(scaled_steps).map(function(i,n) {
        return config.scale_a(n,radius);
    } );

    var scaled_start = config.scale_a(start,radius);
    var centered_start = config.center(scaled_start, centerX, centerY);

    var centered_steps = $(scaled_steps).map(function(i,n) {
        return [config.center(n,centerX, centerY)];
    });


    ctx.beginPath();

    ctx.moveTo(centered_start[0], centered_start[1]);
    ctx.bezierCurveTo(centered_steps[0][0],centered_steps[0][1],centered_steps[0][2],centered_steps[0][3],centered_steps[0][4],centered_steps[0][5]);
    ctx.bezierCurveTo(centered_steps[1][0],centered_steps[1][1],centered_steps[1][2],centered_steps[1][3],centered_steps[1][4],centered_steps[1][5]);
    ctx.bezierCurveTo(centered_steps[2][0],centered_steps[2][1],centered_steps[2][2],centered_steps[2][3],centered_steps[2][4],centered_steps[2][5]);
    ctx.bezierCurveTo(centered_steps[3][0],centered_steps[3][1],centered_steps[3][2],centered_steps[3][3],centered_steps[3][4],centered_steps[3][5]);
    ctx.bezierCurveTo(centered_steps[4][0],centered_steps[4][1],centered_steps[4][2],centered_steps[4][3],centered_steps[4][4],centered_steps[4][5]);
    ctx.bezierCurveTo(centered_steps[5][0],centered_steps[5][1],centered_steps[5][2],centered_steps[5][3],centered_steps[5][4],centered_steps[5][5]);


    ctx.closePath();

    ctx.fill();
    ctx.fillStyle = saveStyle;

}


function redraw() {
    var canvas = $('#canvas')[0];
    $('body').append('<canvas id ="backup"></canvas>');
    var backCanvas = $('#backup')[0];
    backCanvas.width = canvas.width;
    backCanvas.height = canvas.height;
    var backCtx = backCanvas.getContext('2d');

    // save main canvas contents
    backCtx.drawImage(canvas, 0, 0, config.gridStep, config.gridStep);
    // redraw canvas
    ctx.drawImage(backCanvas, 0, 0, config.gridStep, config.gridStep, redrawColumn, redrawRow, config.gridStep, config.gridStep);

    backCanvas.remove();

    redrawColumn += config.gridStep;
    if (redrawColumn > config.canvasWidth - config.gridStep) {
        redrawColumn = 0;
        redrawRow += config.gridStep;
        if (redrawRow > config.canvasHeight - config.gridStep) {
            redrawRow = 0;
        }
    }

}