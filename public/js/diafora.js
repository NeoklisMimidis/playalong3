function mix(buffers) {
	console.log("mix started v2");
    var context = new AudioContext;
	var nbBuffer = buffers.length;// Get the number of buffer contained in the array buffers
    var maxChannels = 0;// Get the maximum number of channels accros all buffers
    var maxDuration = 0;// Get the maximum length

    for (var i = 0; i < nbBuffer; i++) {
        if (buffers[i].numberOfChannels > maxChannels) {
            maxChannels = buffers[i].numberOfChannels;
        }
        if (buffers[i].duration > maxDuration) {
            maxDuration = buffers[i].duration;
        }
    }
	console.log("max duration = ",maxDuration);

    // Get the output buffer (which is an array of datas) with the right number of channels and size/duration
    var mixed = context.createBuffer(maxChannels, context.sampleRate * maxDuration, context.sampleRate);        

    for (var j=0; j<nbBuffer; j++){

        // For each channel contained in a buffer...
        for (var srcChannel = 0; srcChannel < buffers[j].numberOfChannels; srcChannel++) {

            var _out = mixed.getChannelData(srcChannel);// Get the channel we will mix into
            var _in = buffers[j].getChannelData(srcChannel);// Get the channel we want to mix in

            for (var i = 0; i < _in.length; i++) {
                _out[i] += _in[i];// Calculate the new value for each index of the buffer array
            }
        }
    }
	console.log("mixed: ",mixed);
    return mixed;
}

function getLongestBufferDuration(recordedBuffers) {

		let longestDuration = 0;
		
		recordedBuffers.forEach(buffer => {
		  const duration = buffer.length / buffer.sampleRate;
		  if (duration > longestDuration) {
			longestDuration = duration;
		  }
		});
	  console.log(`Longest buffer duration v8: ${longestDuration.toFixed(2)} seconds`);
		return longestDuration;
}

function addBuffers(recordedBuffers) {
  // Find the length of the longest buffer
  let maxLength = 0;
  for (let i = 0; i < recordedBuffers.length; i++) {
    for (let j = 0; j < recordedBuffers[i].length; j++) {
      if (recordedBuffers[i][j].length > maxLength) {
        maxLength = recordedBuffers[i][j].length;
      }
    }
  }

  // Create a new Float32Array to hold the sum of all buffers
  const summedBuffer = new Float32Array(maxLength);

  // Add the samples from each buffer to the summedBuffer
  for (let i = 0; i < recordedBuffers.length; i++) {
    const buffer = recordedBuffers[i];
    for (let j = 0; j < buffer.length; j++) {
      const channel = buffer[j];
      for (let k = 0; k < channel.length; k++) {
        summedBuffer[k] += channel[k];
      }
    }
  }

  return summedBuffer;
}

function addBuffers(recordedBuffers) {
	// Find the length of the longest buffer
	let maxLength = 0;
	for (let i = 0; i < recordedBuffers.length; i++) {
	  for (let j = 0; j < recordedBuffers[i].length; j++) {
		if (recordedBuffers[i][j].length > maxLength) {
		  maxLength = recordedBuffers[i][j].length;
		}
	  }
	}
  
	// Create a new Float32Array to hold the sum of all buffers
	const summedBuffer = new Float32Array(maxLength);
  
	// Add the samples from each buffer to the summedBuffer
	for (let i = 0; i < recordedBuffers.length; i++) {
	  const buffer = recordedBuffers[i];
	  for (let j = 0; j < buffer.length; j++) {
		const channel = buffer[j];
		for (let k = 0; k < channel.length; k++) {
		  summedBuffer[k] += channel[k];
		}
	  }
	}
  
	return summedBuffer;
  }









function combineSelected() {
	console.log("combine files to single wav clicked");
	var muteButtons = document.querySelectorAll(".mute-button");
	var noBlobs = 0;
	var selectedBlobIndices = [];
	for (var i = 0; i < muteButtons.length; i++) {
	  console.log(i);
	  if (muteButtons[i].title == "Mute") {
		combineSelectedButton.title = "Mixing audio...";
		noBlobs++;
		selectedBlobIndices.push(i);
	  }
	}
	selectedBlobs = selectedBlobIndices.map(function (index) {
	  return recordedBlobs[index];
	});
	console.log("selectedBlobs= ", selectedBlobs);
	console.log(noBlobs, " audio blobs to be mixed to a single wav file");
  
	// create an AudioContext
	const audioContext = new AudioContext();
  
	// create an array to store the loaded audio data
	const loadedData = [];
  
	const checkBufferLength = async (data) => {
	  const audioBuffer = await audioContext.decodeAudioData(data);
	  if (audioBuffer.length === 0) {
		throw new Error("Decoded audio buffer has zero length.");
	  }
	  return data;
	};
  
// create an array of promises for loading the audio data
const promises = selectedBlobs.map((blob) => {
	return new Promise((resolve, reject) => {
	  const fileReader = new FileReader();
	  fileReader.readAsArrayBuffer(blob);
	  fileReader.onload = () => {
		console.log('Loaded data byte length:', fileReader.result.byteLength);
		resolve(fileReader.result);
	  };
	  fileReader.onerror = () => {
		reject(fileReader.error);
	  };
	}).then(checkBufferLength); // check the length of the decoded audio buffer
  });
  
  // wait for all promises to resolve and add the loaded data to the loadedData array
  Promise.all(promises)
	.then((data) => {
	  console.log("loadedData:", data);
	  loadedData.push(...data);
  
	  // wait for all promises to resolve before calculating maxLength
	  Promise.all(
		loadedData.map((data) =>
		  audioContext.decodeAudioData(data).then((audioBuffer) => audioBuffer.length)
		)
	  )
		.then((lengths) => {
		  const maxLength = Math.max(...lengths);
		  console.log("maxLength:", maxLength);
  
		  // create a new AudioBuffer for the combined audio
		  const combinedBuffer = audioContext.createBuffer(1, maxLength, audioContext.sampleRate);
  
		  // copy each selected audio file into the appropriate section of the combined AudioBuffer
		  for (let i = 0; i < loadedData.length; i++) {
			audioContext
			  .decodeAudioData(loadedData[i])
			  .then((audioBuffer) => {
				const source = audioBuffer.getChannelData(0);
				const destination = combinedBuffer.getChannelData(0);
				const offset = Math.floor((i * maxLength) / loadedData.length);
				for (let j = 0; j < source.length; j++) {
				  destination[offset + j] += source[j];
				}
			  })
			  .catch((error) => {
				console.error("Error decoding audio data:", error);
			  });
		  }
  
		  // create a new blob to store the combined audio data
		  const blob = new Blob([wavAudio.encodeWAV(combinedBuffer)], { type: "audio/wav" });
		  console.log("Combined audio blob:", blob);
  
		  // create a download link for the combined audio
		  const downloadLink = document.createElement("a");
		  downloadLink.href = URL.createObjectURL(blob);
		  downloadLink.download = "combined_audio.wav";
		  downloadLink.click();
		})
		.catch((error) => {
		  console.error("Error decoding audio data:", error);
		});
	})
	.catch((error) => {
	  console.error("Error loading audio data:", error);
	});
  
}

function mixBuffers(recordedBuffers) {
	if (recordedBuffers.length === 0) {
	  console.log("No audio data to mix.");
	  return;
	}
	
	// Mix audio buffers
	let mixBuffer = recordedBuffers[0].slice(0); // Start with the first buffer
	for (let i = 1; i < recordedBuffers.length; i++) {
	  let buffer = recordedBuffers[i];
	  for (let channel = 0; channel < mixBuffer.numberOfChannels; channel++) {
		let mixChannelData = mixBuffer.getChannelData(channel);
		let channelData = buffer.getChannelData(channel);
		for (let j = 0; j < mixChannelData.length; j++) {
		  mixChannelData[j] += channelData[j];
		}
	  }
	}
	
	// Normalize mixed buffer
	let maxAbsValue = getMaxAbsValue(mixBuffer);
	for (let channel = 0; channel < mixBuffer.numberOfChannels; channel++) {
	  let channelData = mixBuffer.getChannelData(channel);
	  for (let i = 0; i < channelData.length; i++) {
		channelData[i] /= maxAbsValue;
	  }
	}
	console.log ("mixBuffer =  ",mixBuffer);
	exportToCsv(); 
	return mixBuffer;
  }
  
function getMaxAbsValue(buffer) {
	let maxAbsValue = 0;
	for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
	  let channelData = buffer.getChannelData(channel);
	  for (let i = 0; i < channelData.length; i++) {
		maxAbsValue = Math.max(maxAbsValue, Math.abs(channelData[i]));
	  }
	}
	return maxAbsValue;
  }

function exportToCsv() {
	// Convert recordedBuffers array to CSV string
	const csvString = recordedBuffers.map(buffer => {
		const csvRow = [];
		for (let i = 0; i < buffer.length; i++) {
			csvRow.push(buffer[i]);
		}
		return csvRow.join('\n');
	}).join(',');
	
	// Create a Blob object from the CSV string
	const blob = new Blob([csvString], { type: 'text/csv' });
	
	// Create a download link for the Blob object
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = 'recorded-audio.csv';
	document.body.appendChild(link);
	link.click();
  }

function mixAudioBuffers(recordedBuffers, context) {
	const channels = recordedBuffers[0].numberOfChannels;
	const length = recordedBuffers.reduce((acc, buffer) => acc + buffer.length, 0);
	const sampleRate = recordedBuffers[0].sampleRate;
	const mixBuffer = context.createBuffer(channels, length, sampleRate);
  
	for (let channel = 0; channel < channels; channel++) {
		const mixChannelData = mixBuffer.getChannelData(channel);
		let offset = 0;
  
		recordedBuffers.forEach(buffer => {
			const channelData = buffer.getChannelData(channel);
			for (let i = 0; i < channelData.length; i++) {
			mixChannelData[offset + i] += channelData[i];
			}
			offset += buffer.length;
	  	});
	}
  
	return mixBuffer;
  }

function mixBuffersToWav(recordedBuffers) {
	const context = new AudioContext();
	const numberOfChannels = 1; // or 2 for stereo
	const sampleRate = context.sampleRate;
	const length = Math.max(...recordedBuffers.map(buffer => buffer.length));
	const mixBuffer = context.createBuffer(numberOfChannels, length, sampleRate);
  
	for (let i = 0; i < recordedBuffers.length; i++) {
	  const buffer = recordedBuffers[i];
	  const source = context.createBufferSource();
	  source.buffer = context.createBufferFromChannel(buffer, 0);
	  const gainNode = context.createGain();
	  gainNode.gain.value = 1 / recordedBuffers.length;
	  source.connect(gainNode);
	  gainNode.connect(context.destination);
	  source.start(0);
	  for (let channel = 0; channel < numberOfChannels; channel++) {
		const mixChannelData = mixBuffer.getChannelData(channel);
		const bufferChannelData = buffer.getChannelData(channel);
		for (let j = 0; j < bufferChannelData.length; j++) {
		  mixChannelData[j] += bufferChannelData[j] / recordedBuffers.length;
		}
	  }
	}
  
	const wavBuffer = encodeWav(mixBuffer);
	const blob = new Blob([wavBuffer], { type: 'audio/wav' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = 'mixed-audio.wav';
	document.body.appendChild(link);
	link.click();
  }
  
function encodeWav(audioBuffer) {
	const length = audioBuffer.length * audioBuffer.numberOfChannels * 2 + 44;
	const buffer = new ArrayBuffer(length);
	const view = new DataView(buffer);
	const channels = audioBuffer.numberOfChannels;
	const sampleRate = audioBuffer.sampleRate;
	const samples = audioBuffer.length;
	view.setUint32(0, 0x52494646, false);
	view.setUint32(4, length - 8, true);
	view.setUint32(8, 0x57415645, false);
	view.setUint32(12, 0x666D7420, false);
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * channels * 2, true);
	view.setUint16(32, channels * 2, true);
	view.setUint16(34, 16, true);
	view.setUint32(36, 0x64617461, false);
	view.setUint32(40, samples * channels * 2, true);
	const data = new Int16Array(buffer, 44);
	const channelData = audioBuffer.getChannelData(0);
	for (let i = 0; i < samples; i++) {
	  data[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7FFF;
	}
	return buffer;
  }

function exportRecordedBuffersToCsv(filename) {
	const transposedData = transpose(recordedBuffers);
	const csvData = transposedData.map(row => row.join(',')).join('\n');
	const blob = new Blob([csvData], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
}

function transpose(matrix) {
	return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
}



/*

	// iterate through the blob array and load each audio file as an AudioBuffer
	for (let k = 0; k < selectedBlobs.length; k++) {
		const blob_k = selectedBlobs[k];
		const fileReader = new FileReader();
		fileReader.readAsArrayBuffer(blob_k);
		fileReader.onload = () => {
			audioContext_k.decodeAudioData(fileReader.result, (audioBuffer) => {
			// create a new AudioBufferSourceNode for each audio file
			const sourceNode = audioContext_k.createBufferSource();
			sourceNode.buffer = audioBuffer;
			sourceNode.connect(audioContext_k.destination);
			sourceNodes.push(sourceNode);
			});
		};
	}

	let blobArray = []; // new blob array to store audio data

	// loop through each audio file and add their data to the blob array
	for (let n = 0; n < selectedBlobs.length; n++) {
		let reader = new FileReader();
		reader.onload = function() {
			let audioData_n = reader.result;
			blobArray.push(audioData_n);
		};
	reader.readAsArrayBuffer(selectedBlobs[n]);
	}

//	getBufferFromBlobs(selectedBlobs).then(function (singleBlob) {
//		const url = window.URL.createObjectURL(singleBlob);
//		const a = document.createElement("a");
//		document.body.appendChild(a);
//		a.style = "display: none";
//		a.href = url;
//		a.download = "mix.wav";
//		a.click();
//		URL.revokeObjectURL(url);
//		a.remove();
//	});
}

*/


/*

var  _index;

function readFileAsync(blob) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();

        reader.addEventListener("loadend", function () {
            resolve(reader.result);
        });

        reader.onerror = reject;

        reader.readAsArrayBuffer(blob);
    })
}

function getBufferFromBlobs(blobArray) {
    return new Promise((resolve, reject) => {
        var _arrBytes = [];
        var _promises = [];
        if (blobArray.length > 0) {
            blobArray.forEach((blob, index) => {
                var dfd = new Promise((resolve, reject) => {
                    readFileAsync(blob).then(function (byteArray) {
                        _arrBytes.push(byteArray);
                        resolve();
                    }).catch(reject);
                });
                _promises.push(dfd);
            });

            Promise.all(_promises).then(function () {
                var _blob = combineWavsBuffers(_arrBytes);
                resolve(_blob);
            }).catch(reject);
        }
    });
}

function loadWav(blobArray) {
    return getBufferFromBlobs(blobArray);
    debugger;
    //    .then(function (bufferArray) {
    //    return combineWavsBuffers(bufferArray); //Combine original wav buffer and play
    //});
}

function combineWavsBuffers(bufferArray) {

    if (bufferArray.length > 0) {
        var _bufferLengths = bufferArray.map(buffer => buffer.byteLength);

        // Getting sum of numbers
        var _totalBufferLength = _bufferLengths.reduce(function (a, b) {
            return a + b;
        }, 0);

        var tmp = new Uint8Array(_totalBufferLength);

        //Get buffer1 audio data to create the new combined wav
        var audioData = getAudioData.WavHeader.readHeader(new DataView(bufferArray[0]));
        var _bufferLength = 0;
        for (var i = 0; i < bufferArray.length; i++) {
            var buffer = bufferArray[i];
            //Combine array bytes of original wavs buffers.
            tmp.set(new Uint8Array(buffer), _bufferLength);

            _bufferLength+= buffer.byteLength;
        }
        
        //Send combined buffer and send audio data to create the audio data of combined
        var arrBytesFinal = getWavBytes(tmp, {
            isFloat: false,       // floating point or 16-bit integer
            numChannels: audioData.channels,
            sampleRate: audioData.sampleRate,
        });

        //Create a Blob as Base64 Raw data with audio/wav type
        return new Blob([arrBytesFinal], { type: 'audio/wav; codecs=MS_PCM' });
    }
    return null;
}

//Combine two audio .wav buffers.
function combineWavsBuffers1(buffer1, buffer2) {

    //Combine array bytes of original wavs buffers
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);

    //Get buffer1 audio data to create the new combined wav
    var audioData = getAudioData.WavHeader.readHeader(new DataView(buffer1));
    console.log('Audio Data: ', audioData);

    //Send combined buffer and send audio data to create the audio data of combined
    var arrBytesFinal = getWavBytes(tmp, {
        isFloat: false,       // floating point or 16-bit integer
        numChannels: audioData.channels,
        sampleRate: audioData.sampleRate,
    });

    //Create a Blob as Base64 Raw data with audio/wav type
    return new Blob([arrBytesFinal], { type: 'audio/wav; codecs=MS_PCM' });
}

//Other functions //////////////////////////////////////////////////////////////

// Returns Uint8Array of WAV bytes
function getWavBytes(buffer, options) {
    const type = options.isFloat ? Float32Array : Uint16Array
    const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT

    const headerBytes = getWavHeader(Object.assign({}, options, { numFrames }))
    const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);

    // prepend header, then add pcmBytes
    wavBytes.set(headerBytes, 0)
    wavBytes.set(new Uint8Array(buffer), headerBytes.length)

    return wavBytes
}

// adapted from https://gist.github.com/also/900023
// returns Uint8Array of WAV header bytes
function getWavHeader(options) {
    const numFrames = options.numFrames
    const numChannels = options.numChannels || 2
    const sampleRate = options.sampleRate || 44100
    const bytesPerSample = options.isFloat ? 4 : 2
    const format = options.isFloat ? 3 : 1

    const blockAlign = numChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = numFrames * blockAlign

    const buffer = new ArrayBuffer(44)
    const dv = new DataView(buffer)

    let p = 0

    function writeString(s) {
        for (let i = 0; i < s.length; i++) {
            dv.setUint8(p + i, s.charCodeAt(i))
        }
        p += s.length
    }

    function writeUint32(d) {
        dv.setUint32(p, d, true)
        p += 4
    }

    function writeUint16(d) {
        dv.setUint16(p, d, true)
        p += 2
    }

    writeString('RIFF')              // ChunkID
    writeUint32(dataSize + 36)       // ChunkSize
    writeString('WAVE')              // Format
    writeString('fmt ')              // Subchunk1ID
    writeUint32(16)                  // Subchunk1Size
    writeUint16(format)              // AudioFormat
    writeUint16(numChannels)         // NumChannels
    writeUint32(sampleRate)          // SampleRate
    writeUint32(byteRate)            // ByteRate
    writeUint16(blockAlign)          // BlockAlign
    writeUint16(bytesPerSample * 8)  // BitsPerSample
    writeString('data')              // Subchunk2ID
    writeUint32(dataSize)            // Subchunk2Size

    return new Uint8Array(buffer)
}

function getAudioData() {


    function WavHeader() {
        this.dataOffset = 0;
        this.dataLen = 0;
        this.channels = 0;
        this.sampleRate = 0;
    }

    function fourccToInt(fourcc) {
        return fourcc.charCodeAt(0) << 24 | fourcc.charCodeAt(1) << 16 | fourcc.charCodeAt(2) << 8 | fourcc.charCodeAt(3);
    }

    WavHeader.RIFF = fourccToInt("RIFF");
    WavHeader.WAVE = fourccToInt("WAVE");
    WavHeader.fmt_ = fourccToInt("fmt ");
    WavHeader.data = fourccToInt("data");

    WavHeader.readHeader = function (dataView) {
        var w = new WavHeader();

        var header = dataView.getUint32(0, false);
        if (WavHeader.RIFF != header) {
            return;
        }
        var fileLen = dataView.getUint32(4, true);
        if (WavHeader.WAVE != dataView.getUint32(8, false)) {
            return;
        }
        if (WavHeader.fmt_ != dataView.getUint32(12, false)) {
            return;
        }
        var fmtLen = dataView.getUint32(16, true);
        var pos = 16 + 4;
        switch (fmtLen) {
            case 16:
            case 18:
                w.channels = dataView.getUint16(pos + 2, true);
                w.sampleRate = dataView.getUint32(pos + 4, true);
                break;
            default:
                throw 'extended fmt chunk not implemented';
        }
        pos += fmtLen;
        var data = WavHeader.data;
        var len = 0;
        while (data != header) {
            header = dataView.getUint32(pos, false);
            len = dataView.getUint32(pos + 4, true);
            if (data == header) {
                break;
            }
            pos += (len + 8);
        }
        w.dataLen = len;
        w.dataOffset = pos + 8;
        return w;
    };

    getAudioData.WavHeader = WavHeader;

}

getAudioData();


*/


//playallStatus = !playallStatus;

	//if (wavesurfer0.isPlaying()) {
	//	playallButton.setAttribute("title","Pause");
	//	playallButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
	//} else {
	//	playallButton.setAttribute("title","Play");
	//	playallButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
	//}
