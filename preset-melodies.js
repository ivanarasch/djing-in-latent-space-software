var everyNote = 'C,C#,D,D#,E,F,F#,G,G#,A,A#,B,'.repeat(20).split(',').map(function(x,i) {
    return x + '' + Math.floor(i/12);
});
function toMidi(note) { return everyNote.indexOf(note); }

var presetMelodies = {
    'Twinkle' : {
        notes: [
            {pitch: 60, quantizedStartStep: 0, quantizedEndStep: 2},
            {pitch: 60, quantizedStartStep: 2, quantizedEndStep: 4},
            {pitch: 67, quantizedStartStep: 4, quantizedEndStep: 6},
            {pitch: 67, quantizedStartStep: 6, quantizedEndStep: 8},
            {pitch: 69, quantizedStartStep: 8, quantizedEndStep: 10},
            {pitch: 69, quantizedStartStep: 10, quantizedEndStep: 12},
            {pitch: 67, quantizedStartStep: 12, quantizedEndStep: 16},
            {pitch: 65, quantizedStartStep: 16, quantizedEndStep: 18},
            {pitch: 65, quantizedStartStep: 18, quantizedEndStep: 20},
            {pitch: 64, quantizedStartStep: 20, quantizedEndStep: 22},
            {pitch: 64, quantizedStartStep: 22, quantizedEndStep: 24},
            {pitch: 62, quantizedStartStep: 24, quantizedEndStep: 26},
            {pitch: 62, quantizedStartStep: 26, quantizedEndStep: 28},
            {pitch: 60, quantizedStartStep: 28, quantizedEndStep: 32}
        ],
        color: [113, 20, 221]
    },
    'Sparse' : {
        notes: [
            {pitch: 64, quantizedStartStep: 0, quantizedEndStep: 1},
            {pitch: 62, quantizedStartStep: 1, quantizedEndStep: 2},
            {pitch: 64, quantizedStartStep: 2, quantizedEndStep: 3},
            {pitch: 65, quantizedStartStep: 3, quantizedEndStep: 4},
            {pitch: 67, quantizedStartStep: 4, quantizedEndStep: 8},
            {pitch: 60, quantizedStartStep: 16, quantizedEndStep: 17},
            {pitch: 59, quantizedStartStep: 17, quantizedEndStep: 18},
            {pitch: 60, quantizedStartStep: 18, quantizedEndStep: 19},
            {pitch: 62, quantizedStartStep: 19, quantizedEndStep: 20},
            {pitch: 64, quantizedStartStep: 20, quantizedEndStep: 24}
        ],
        color: [245, 109, 49]
    },
    'Bounce' : {
        notes: [
            {pitch: 64, quantizedStartStep: 0, quantizedEndStep: 2},
            {pitch: 60, quantizedStartStep: 2, quantizedEndStep: 4},
            {pitch: 64, quantizedStartStep: 4, quantizedEndStep: 6},
            {pitch: 60, quantizedStartStep: 6, quantizedEndStep: 8},
            {pitch: 65, quantizedStartStep: 8, quantizedEndStep: 10},
            {pitch: 60, quantizedStartStep: 10, quantizedEndStep: 12},
            {pitch: 65, quantizedStartStep: 12, quantizedEndStep: 14},
            {pitch: 60, quantizedStartStep: 14, quantizedEndStep: 16},
            {pitch: 67, quantizedStartStep: 16, quantizedEndStep: 18},
            {pitch: 60, quantizedStartStep: 18, quantizedEndStep: 20},
            {pitch: 67, quantizedStartStep: 20, quantizedEndStep: 22},
            {pitch: 60, quantizedStartStep: 22, quantizedEndStep: 24},
            {pitch: 62, quantizedStartStep: 24, quantizedEndStep: 26},
            {pitch: 59, quantizedStartStep: 26, quantizedEndStep: 28},
            {pitch: 62, quantizedStartStep: 28, quantizedEndStep: 30},
            {pitch: 59, quantizedStartStep: 30, quantizedEndStep: 32}
        ],
        color: [221, 44, 87]
    },
    'Song A Melody' : {
        notes: [
            {pitch: 76, quantizedStartStep: 0, quantizedEndStep: 3},
            {pitch: 64, quantizedStartStep: 4, quantizedEndStep: 8},
            {pitch: 76, quantizedStartStep: 8, quantizedEndStep: 11},
            {pitch: 70, quantizedStartStep: 12, quantizedEndStep: 13},
            {pitch: 68, quantizedStartStep: 13, quantizedEndStep: 15},
            {pitch: 68, quantizedStartStep: 15, quantizedEndStep: 21},
            {pitch: 76, quantizedStartStep: 21, quantizedEndStep: 24},
            {pitch: 74, quantizedStartStep: 24, quantizedEndStep: 25},
            {pitch: 68, quantizedStartStep: 26, quantizedEndStep: 29},
            {pitch: 76, quantizedStartStep: 30, quantizedEndStep: 32}
        ],
        color: [255, 60, 0]
    },
    'Song A Bass' : {
        notes: [
            {pitch: 55, quantizedStartStep: 0, quantizedEndStep: 4},
            {pitch: 54, quantizedStartStep: 5, quantizedEndStep: 8},
            {pitch: 55, quantizedStartStep: 8, quantizedEndStep: 13},
            {pitch: 54, quantizedStartStep: 13, quantizedEndStep: 15},
            {pitch: 54, quantizedStartStep: 15, quantizedEndStep: 17},
            {pitch: 55, quantizedStartStep: 21, quantizedEndStep: 25},
            {pitch: 54, quantizedStartStep: 26, quantizedEndStep: 30},
            {pitch: 55, quantizedStartStep: 30, quantizedEndStep: 32}
        ],
        color: [255, 120, 0]
    },
    'Song B Melody' : {
        notes: [
            {pitch: 66, quantizedStartStep: 0, quantizedEndStep: 3},
            {pitch: 66, quantizedStartStep: 3, quantizedEndStep: 4},
            {pitch: 71, quantizedStartStep: 4, quantizedEndStep: 7},
            {pitch: 69, quantizedStartStep: 7, quantizedEndStep: 10},
            {pitch: 69, quantizedStartStep: 10, quantizedEndStep: 13},
            {pitch: 83, quantizedStartStep: 13, quantizedEndStep: 14},
            {pitch: 66, quantizedStartStep: 14, quantizedEndStep: 17},
            {pitch: 66, quantizedStartStep: 17, quantizedEndStep: 20},
            {pitch: 66, quantizedStartStep: 20, quantizedEndStep: 21},
            {pitch: 71, quantizedStartStep: 21, quantizedEndStep: 24},
            {pitch: 69, quantizedStartStep: 24, quantizedEndStep: 27},
            {pitch: 69, quantizedStartStep: 27, quantizedEndStep: 30},
            {pitch: 83, quantizedStartStep: 30, quantizedEndStep: 31},
            {pitch: 66, quantizedStartStep: 31, quantizedEndStep: 32}
        ],
        color: [0, 229, 255]
    },
    'Song B Bass' : {
        notes: [
            {pitch: 43, quantizedStartStep: 0, quantizedEndStep: 4},
            {pitch: 43, quantizedStartStep: 4, quantizedEndStep: 8},
            {pitch: 43, quantizedStartStep: 8, quantizedEndStep: 13},
            {pitch: 45, quantizedStartStep: 13, quantizedEndStep: 17},
            {pitch: 43, quantizedStartStep: 17, quantizedEndStep: 21},
            {pitch: 43, quantizedStartStep: 21, quantizedEndStep: 25},
            {pitch: 45, quantizedStartStep: 25, quantizedEndStep: 29},
            {pitch: 43, quantizedStartStep: 29, quantizedEndStep: 32}
        ],
        color: [0, 150, 255]
    }
};
