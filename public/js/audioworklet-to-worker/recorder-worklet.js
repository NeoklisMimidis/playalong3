const exports = {};

class RecorderWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();

    // Staging buffer to interleave the audio data.
    this.interleaved = new Float32Array(128 * 2); // stereo
    const sab = options.processorOptions;
    this._audio_writer = new AudioWriter(new RingBuffer(sab, Float32Array));

    this.recording = undefined;
    this.noChannels = options.noChannels;

    this.port.onmessage = async e => {
      if (e.data.startRecording) {
        this.recording = true;
      } else if (e.data.stopRecording) {
        this.recording = false;
      } else if (e.data.numChannels) {
        this.noChannels = e.data.numChannels;
      }
    };
  }

  process(inputs, _outputs, _parameters) {
    if (this.recording) {
      if (inputs[0].length === 0) return true;

      if (inputs[0]) {
        if (this.noChannels === 1) {
          const monoInput = inputs[0][0]; // Take one of the channels
          if (this._audio_writer.enqueue(monoInput) !== 128) {
            console.log("underrun: the worker doesn't dequeue fast enough!");
          }
        } else if (this.noChannels === 2) {
          interleave(inputs[0], this.interleaved); // Interleave
          if (this._audio_writer.enqueue(this.interleaved) !== 256) {
            console.log("underrun: the worker doesn't dequeue fast enough!");
          }
        }
      }
    }
    return true;
  }
}

registerProcessor('recorder-worklet', RecorderWorklet);
