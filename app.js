$(document).ready(function(){
    // Inicializações do sistema
    var d = new Date()
    var s = d.format("dd/m/yy hh:mm:ss");
    $("#terminal").Ptty({
	theme: "fallout",
	width: "100%",
	height: "100%",
	welcome: "..........................................\n. Virtual machine started at             .\n. "+d+".\n. type <emph>help</emph> for instructions             .\n.........................................."
    })

    // a máquina de áudio
    var runtime = null;

    // uma base de dados dummy
    var environment = {
	tau: "var tau = 2*Math.PI;",
	mute: "var mute = function(){\n  return 0\n};",
	stereo: "var stereo = function(fn){\n"+
	    "  var c = [0,0];\n"+
	    "  for(var i=0; i<c.length; i++){\n"+
	    "    c[i] = fn(i);\n"+
	    "  };\n"+
	    "  return c\n"+
	    "};",
	tmodf: "var tmodf = function(f, t){\n  return t % (1 / f) * f\n};",
	sin: "var sin = function(f, a, t){\n  return a*Math.sin(tau*f*t)\n};",
	sin2:"var sin2 = function(f, a, t){\n"+
	    "  var fn = function fn(i){\n"+
	    "    var amp = typeof(a) === 'object'?a[i]:a;\n"+
	    "    var tmp = typeof(t) === 'object'?t[i]:t;\n"+
	    "    return sin(f[i], amp, tmp)\n"+
	    "  };\n"+
	    "  return stereo(fn);\n"+
	    "}",
	saw: "var saw = function(f, a, t){\n  return (1 - 2 * tmodf(f, t))* a\n};",
	ramp: "var ramp = function(f, a, t){\n  return (2 * tmodf(f, t) - 1) * a\n};",
	tri: "var tri = function(f, a, t){\n  return (Math.abs(1 - (2 * t * f) % 2) * 2 - 1) * a\n};",
	sqr: "var sqr = function(f, a, t){\n  return ((t*f % 1/f < 1/f/2) * 2 - 1) * a\n};",
	pulse: "var pulse = function(f, a, w, t){\n  return ((t*f % 1/f < 1/f/2*w) * 2 - 1) * a\n};",
	noise: "var noise = function(a){\n  return a*(Math.random()*2-1)\n};",
	am: "var am = function(car, amp, mod, index, t){\n return amp*(sin(car, amp, t) * sin(mod, index, t))\n};",
	fm: "var fm = function(car, ic, mod, im, amp, t){\n return amp*(sin(car, ic, t) + sin(mod, im, t))\n};",
	env: "var env = function(input, head, measure, decay, release, t){\n return input * Math.exp(-tenv(head,measure,t)*(1/decay)*Math.exp(tenv(head,measure,t)*(1/release)))\n};",
	tenv: "var tenv = function(head, measure, t){\n return (t/head)%measure\n};",
	test: "var test = function(t){\n return env(sin(440,1,t),1,1,0.5,0.15,t)\n};",
	seq: "var seq = function(a,t){\n"+
	    "  return a[Math.floor(t%a.length)]\n"+
	    "};"
    }
    var current = null;
    var scope = {}

    var register = function(name){
	$.register_callback(name, function(data){
	    var typebox = $('<div></div>').appendTo('.cmd_terminal_content');
	    cb = "\nreturn "+data.callback+"(";
	    for(var i=0; i<data.params.length; i++){
		cb += ""+data.params[i];
		if(i<data.params.length-1) cb+=", ";
	    }
	    cb+=");";
			
	    envir=""
	    for(var v in environment){
		envir += (environment[v]+"\n");
	    }
			
	    envir += "var dsp = function(t){\n\t"+cb+"\n};";
	    window.console.log(envir);
	    var result = runtime.compile(envir);
	    typebox.text(result);
	});
    }

    for(var e in environment){
	register(e);
    }
  
    var cmd_wavepot = function(enter, bufferSize, channels){
	if(enter){
	    try{
		runtime = new window.WavepotRuntime(null, bufferSize, channels)
                runtime.init() 
		return "..................................\n. sintetizador de sample a sample. \n. amostragem: "+runtime.context.sampleRate+"              .\n. canais: "+runtime.channels+"                      .\n. buffer: "+runtime.bufferSize+"                   .\n.................................."
	    }
	    catch(e){
		return e.toString()
	    }
	}
	else{
	    runtime.stop();
	    runtime = null;
	    return "audio cleared"
	}
    }

    $.register_command(
	'wavepot',
	'start wavepot runtime for audio synthesis',
	'wavepot [no options] ou [tamanho do buffer, canais]\nApós inicializado tente help',
	{
	    ps: 'wavepot',
	    
            start_hook : function(args){ 
		var result = cmd_wavepot(true, args[1], args[2])
		return {
		    type : 'print', 
		    out : result 
		}; 
            },

            exit_hook : function(){ 
		return {
                    type : 'print',
                    out : cmd_wavepot(false)
		}; 
            },

            dispatch_method : function(args){
		if(args[0] === "help"){
		    var msg = ""
		    if(args[1] === undefined){
			msg = "adicionalmente é possível digitar\n"+
			"  help [comando]\n"+
			"comandos:\n"+
			"  play: toca\n"+
			"  stop: para\n"+
			"  pause: para\n"+
			"  reset: volta a fita\n"+
			"  exit: vaza\n"+
			"  exe: executa alguma coisa\n"+
			"  def: define uma nova função\n"+
			"  inspect: inspeciona todas as variáveis do ambiente\n"+
			"  record: grava\n"+
			"  export: converte para áudio .wav"
		    }
		    else if(args[1] === "play"){
			msg = "'Passageiro para o taxista: senhor, me leve ao número 37; quando chegarmos lá eu lhe falo o nome da rua' (Anedota que ilustra a implementação)"+
			    "\nEste comando pode ser usado antes ou depois de definir um módulo de áudio\n"+
			    "---------------\n"+
			    "retorna BOOLEAN"
		    }
		    else if(args[1] === "stop"){
			msg = "para o audio\n"+
			    "---------------\n"+
			    "retorna BOOLEAN"
		    }
		    else if(args[1] === "pause"){
			msg = "pausa o audio\n"+
			    "---------------\n"+
			    "retorna BOOLEAN"
		    }
		    else if(args[1] === "reset"){
			 msg = "de volta ao passado...\n"+
			    "---------------\n"+
			    "retorna FLOAT"
		    }
		    else if(args[1] === "record"){
			 msg = "começa a gravar\n"+
			    "---------------\n"+
			    "retorna BOOLEAN"
		    }
		    else if(args[1] === "export"){
			 msg = "exporta o que foi gravado para um player embutido\n"+
			    "e fica disponível para download\n"+
			    "---------------\n"+
			    "retorna BOOLEAN"
		    }
		    else if(args[1] === "exe"){
			 msg = "Executa uma função; deve ser seguido do módulo e de seus respectivos argumentos\n"+
			"  tmodf - utilizado internamente paras as saw pulse e ramp\n"+
			"  sin - senoide[frequencia, amplitude, fase]\n"+
			"  saw - dente-de-serra[frequencia, amplitude, fase]\n"+
			"  tri - triangular[frequencia, amplitude, fase]\n"+
			"  ramp - rampa[frequencia, amplitude, fase]\n"+
			"  pulse - pulso[frequencia, amplitude, tamanho, fase]\n"+
			"  noise - ruido[amplitude]\n"+
			"  am - modulação de amplitude[portadora,amplitude,moduladora,index,fase]\n"+
			"  fm - modulação de frequencia[portadora,amplitude,moduladora,index,fase]\n"+
			"\n"+
			"exemplos:\n"+
			"  (1) exe noise 0.71\n"+
			"  (2) exe sin 440 0.71 t\n"+
			"  (3) exe tri 440 0.71 t\n\n"+
			" É possível colocar outros sintetizadores dentro dos parâmetros\n"+
			" Atenção que internamente deve-se escrever sem espações e utilizando a vírgula\n\n"+
			"  (4) exe sin sin(440,0.71,t) 1 t\n"+
			"  (5) exe am 440 sin(0.01,1,t) 543 0.71 1\n"
		    }
		    else if(args[1] === "def"){
			 msg = "O comando def define uma nova função"+
			"  def nome args... resultado\n"+
			"    exemplos:\n"+
			"      (1) def funcao a a\n"+
			"        retorna uma simples funcao chamando o argumento\n"+
		        "      (2) def somaum a a+1\n"+
			"        retorna uma soma do argumento mais 1\n"+
			"      (3) def soma a b a+b\n"+
			"        retorna uma funcao que soma os argumentos\n"+
		        "      (4) def randomico Math.random()\n"+
			"        retorna um numero randomico, sem argumentos\n"+
			"      (5) def ruido_branco Math.random()*2-1\n"+
			"Tais comandos estarão disponíveis imediatamente para execução\n"+
			"  (ver comando exe)"+
			"\n"+
			"Existe uma outra opção interessante: após executar o comando exe ...\n"+
			"é possível definir uma função que será a mesma que está sendo executada\n"+
			"    exemplo:\n"+
			"      (1) exe sin 440 sin(330,1,t) t\n"+
			"      (2) def exe minhaam\n"+
			"      (3) inspect minhaam\n"+
			"      [executando nova função]\n"+
			"          exe minhaam t\n"
		    }
		    else if(args[1] === "inspect"){
			 msg = "inspeciona tudo se não for dado nenhum argumento\n"+
			    "Se for dado um argumento, procurará se este existe;\n em caso positivo mostra o código fonte\n"+
			    "  exemplo:\n"+
			    "    (1) inspect\n"+
			    "    (2) inspect noise\n"
		    }
		    
		    return {type: 'print', out: msg}
			
		}
		if(args[0] === "play"){
		    runtime.play()
		    return {
			type: 'print',
			out: runtime.playing
		    }
		}
		if(args[0] === "stop"){
		    runtime.stop()
		    return {
			type:'print', 
			out: !runtime.playing
		    }
		}
		if(args[0] === "mute"){
		    return {
			type:'print', 
			callback: 'mute',
			out: "muted"
		    }
		}
		if(args[0] === "pause"){
		    runtime.pause()
		    return {
			type:'print', 
			out: !runtime.playing
		    }
		}
		if(args[0] === "reset"){
		    var previous_time = runtime.time;
		    runtime.reset()
		    return {
			type:'print', 
			out: previous_time+"->"+runtime.time
		    }
		}
		if(args[0] === "record"){
		    runtime.record(true);
		    return {
			type:'print', 
			out: runtime.recording
		    }
		}
		if(args[0] === "export"){
		    runtime.exportWAV(function(blob){
                        console.log(blob);
                        runtime.stop()
                        runtime.clear()
			var url = window.URL.createObjectURL(blob)
			
			var $typebox = $("<div>Sua gravação, você pode fazer o <a href="+url+">Download aqui</a></div>").appendTo('.cmd_terminal_content');
			var $br = $('<br/>').appendTo($typebox);
			var $audio = $("<audio controls><source src="+url+"></source></audio>").appendTo($typebox);
		    });
		    return {
			type:'print', 
			out: runtime.recording
		    }
		}
		if(args[0] === "def"){
		    var fn = null;
		    var _args = null;
		    var name = null;

		    if(args[1] === "exe" && args[2]){
			name = args[2];
			fn = "var "+name+" = function(t){\n  return "
			fn += ""+current.callback+"("
			for(var i=0; i<current.params.length; i++){
			    fn += ""+current.params[i];
			    if(i<current.params.length-1) fn+=", ";
			}
			fn += ")\n};";
			environment[name] = fn;
			register(name)
		    }
		    else{
			name = args[1]
			_args = args.slice(2, args.length-1);
			fn = "var "+args[1]+" = function(";
			for(var i=0; i<=_args.length-1;i++){
			    fn += ""+_args[i];
			    if(i<_args.length-1) fn+=", ";
			}
			fn += "){\n  return "+args[args.length-1]+";\n};";
			environment[name] = fn;
			register(name)
		    }

		    return {
			type:'print', 
			out: name+" defined"
		    }
		}
		if(args[0] === "inspect"){
		    var msg = "funções definidas\n"
		    var i = 0;
		    if(args[1] === undefined){
			for(var v in environment){
			    msg += v+"\t";
			    if(i%7===0) msg+="\n"
			    i++;
			}
		    }
		    else{
			msg = environment[args[1]]
		    }
		    return {type:'print', out: msg}
		}
		if(args[0] === "exe"){
		    var p = [];
		    if(args.length === 3) p.push(args[2]);
		    if(args.length > 3) p = args.slice(2, args.length)
		    current = {callback: args[1], params: p};
		    return {
			type: 'print',
			callback: args[1],
			params: p
		    }
		}
		    
            }
	}
    )
    
})

