
// quick implementation of the wavepot script playback engine

var contextClass = (window.AudioContext || window.webkitAudioContext)
function WavepotRuntime(context, bufferSize, channels) {
    this.code = '';
    this.scope = {};
    this.time = 0;
    this.context = context || new contextClass();
    this.playing = false;
    this.bufferSize = bufferSize || 1024;
    this.channels = channels || 2
    this.scriptnode = this.context.createScriptProcessor(this.bufferSize, 0, this.channels);
    this.worker = new Worker('recorderWorker.js');
    this.worker.postMessage({
        command: 'init',
        config: {
            sampleRate: this.context.sampleRate
        }
    });
    this.recording = false;

}

WavepotRuntime.prototype.init = function(callback){

    var _this = this

    // Maquina virtual de DSP
    this.scriptnode.onaudioprocess = function(e) {
    
	// Sistema estereofonico de 2 canais
	var out = [
            e.outputBuffer.getChannelData(0),
            e.outputBuffer.getChannelData(1)
        ];
            
	// Tempo discretizado
	var f = 0, t = 0, td = 1.0 / _this.context.sampleRate;
            
	// A cada janela temporal, o valor numerico
	// de amplitude vai ser atualizado
	if (_this.scope && _this.scope.dsp && _this.playing) {
            t = _this.time;
	    _this.scope.set_controls(_this.controls);
            for (var i = 0; i < out[0].length; i++) {
		// Ajusta o relógio
		_this.scope.set_time(t);
		// função definida dinamicamente
		f = _this.scope.dsp();

		// Se a funcao retornar um número
		// utilizar ele nos dois canais
		// Se a funcao retornar um Array
		// de dois valores, separar nos canais
		if(typeof(f) === 'number'){
                    out[0][i] =  f
                    out[1][i] =  f
		}
		else if (typeof(f) === 'object'){
                    out[0][i] =  f[0]
                    out[1][i] =  f[1]
		}
		// Incrementar o tempo
		t += td;
            }
	    _this.time = t;
    
            // Continuar o processamento se nada for atualizado
	} else {
            for (var i = 0; i < out[0].length; i++) {
		out[0][i] = f[0] | f
		out[1][i] = f[1] | f
            }
	}
      
	// Gravar, se for solicitado
	if (_this.recording){
            _this.worker.postMessage({
		command: 'record',
		buffer: out
            });
	}
    }
    this.scriptnode.connect(_this.context.destination);
}

// Controles
// Qualquer controle
// adicionado através do comando de terminal
WavepotRuntime.prototype.addControl = function(name, obj){
    if(!this.controls) this.controls = {}
    this.controls[name] = obj;
} 

WavepotRuntime.prototype.setControl = function(name, obj){
    if(this.controls[name]){
	this.controls[name].value = obj.value;
    }
    else{
	throw new Error(name+" not Found!")
    }
}

WavepotRuntime.prototype.compile = function(code) {
    // console.log('WavepotRuntime: compile', code);
    this.code = code;
    var ee = null;
    var newscope = new Object();

    try {
	var _code = "var sampleRate = "+this.context.sampleRate+";\n\n"+
	    "var t = 0;\n\n"+
	    "var bpm = 60;\n\n"+
	    "var controls = {};\n\n"+
	    "this.set_time = function(time){ t = time};\n" +
	    "this.set_controls = function(c){ controls = c};\n"+
	    code + 
	    '\n\nthis.dsp = dsp;'
	var f = new Function(_code);
	console.log(f);
	var r = f.call(newscope);
	//    console.log(r);
    } catch(e) {
	//    console.log(e);
	ee = e;
    }
    //    console.log('WavepotRuntime: compiled', newscope);
    if (newscope && typeof(newscope.dsp) == 'function') {
	this.scope = newscope;
	return true;
    } else {
    if(ee){
        return ee.stack.toString();
    }
    return false;
    }
}

WavepotRuntime.prototype.play = function() {
    // console.log('WavepotRuntime: play');
    this.playing = true;
}

WavepotRuntime.prototype.stop = function() {
    // console.log('WavepotRuntime: stop');
    this.playing = false;
        this.recording = false;
}

WavepotRuntime.prototype.reset = function() {
    // console.log('WavepotRuntime: reset');
    this.time = 0;
}

WavepotRuntime.prototype.record = function(b){
        this.recording = b;
}

WavepotRuntime.prototype.clear = function(){
        this.worker.postMessage({ command: 'clear' });
}

WavepotRuntime.prototype.exportWAV = function(cb){
      type =  'audio/wav';
      if (!cb) throw new Error('Callback not set');
      this.worker.postMessage({
        command: 'exportWAV',
        type: type
      });
      this.worker.onmessage = function(e){
        var blob = e.data;
        cb(blob);
      }
}
