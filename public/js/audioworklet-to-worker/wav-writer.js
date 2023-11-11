const exports = {};

function readFromQueue() {
  // Read some float32 pcm from the queue,
  const samples_read = this._audio_reader.dequeue(this.staging);
  // console.log(`🚀: - readFromQueue - samples_read:`, samples_read);

  if (!samples_read) {
    return 0;
  }

  // For wav file download. Convert to int16 pcm, and push it to
  // our global queue.
  const segment = new Int16Array(samples_read);
  for (let i = 0; i < samples_read; i++) {
    segment[i] =
      Math.min(Math.max(this.staging[i], -1.0), 1.0) * (2 << (14 - 1));

    // MB, build also an array of float32 samples, for future conversion
    // to an AudioBuffer.
    audioBuf.push(this.staging[i]);
  }
  pcm.push(segment);

  return samples_read;
}

/*
The Web Worker can receive three types of commands:

a) "init": Initializes the worker with necessary data structures and configurations. 
   - Sets up an AudioReader with a shared RingBuffer for audio data.
   - Configures channel count and sample rate for the audio stream.
   - Prepares arrays for storing PCM data and audio buffer.
   - Initializes a staging array for intermediate audio data processing.

b) "startWorker": Starts a routine to periodically read data from the audio queue.
   - Sets an interval to repeatedly invoke the readFromQueue function every 100ms.

c) "stopAndSendAsBuffer": Stops the data reading routine and processes the accumulated audio data.
   - Clears the interval set by "startWorker" to stop reading from the queue.
   - Drains any remaining data from the ring buffer.
   - Sends the accumulated audio buffer back to the main thread.
   - Resets the worker's state for potential reuse, reinitializing data structures.
*/
onmessage = function (e) {
  switch (e.data.command) {
    case 'init': {
      this._audio_reader = new exports.AudioReader(
        new RingBuffer(e.data.sab, Float32Array)
      );
      // The number of channels of the audio stream read from the queue.
      this.channelCount = e.data.channelCount;
      // The sample-rate of the audio stream read from the queue.
      this.sampleRate = e.data.sampleRate;

      // Store the audio data, segment by segments, as array of int16 samples.
      this.pcm = [];
      // MB
      this.audioBuf = [];
      // A smaller staging array to copy the audio samples from, before conversion
      // to uint16. It's size is 4 times less than the 1 second worth of data
      // that the ring buffer can hold, so it's 250ms, allowing to not make
      // deadlines:
      // staging buffer size = ring buffer size / sizeof(float32) / stereo / 4
      this.staging = new Float32Array(
        e.data.sab.byteLength / 4 / 4 / e.data.channelCount
      ); // FIXME maybe also here modify depending on mono or stereo?
      this.sab = e.data.sab;

      console.log(`🚀: - WORKER INIT (this):`, this);
      break;
    }
    case 'startWorker': {
      // Attempt to dequeue every 100ms. Making this deadline isn't critical:
      // there's 1 second worth of space in the queue, and we'll be dequeuing
      interval = setInterval(readFromQueue, 100);
      break;
    }
    case 'stopAndSendAsBuffer': {
      clearInterval(interval);

      // Drain the ring buffer
      while (readFromQueue()) {
        /* empty */
      }

      console.log('Worker: Post message "stopAndSendAsBuffer"');
      postMessage({
        command: 'audioBufferFinal',
        buffer: audioBuf,
      });

      // Reset worker
      this.pcm = [];
      this.audioBuf = [];
      this._audio_reader = new exports.AudioReader(
        new RingBuffer(this.sab, Float32Array)
      );
      this.staging = new Float32Array(
        this.sab.byteLength / 4 / 4 / this.channelCount
      );

      console.log(`🚀: -Reset worker (this):`, this);
      break;
    }
    default: {
      throw Error('Case not handled');
    }
  }
};
