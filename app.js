$(document).ready(function(){
    // Inicializações do sistema
    var d = new Date()
    var s = d.format("dd/m/yy hh:mm:ss");
    $("#terminal").Ptty({
	theme: "fallout",
	welcome: "..........................................\n. Virtual machine started at             .\n. "+d+".\n. type <emph>help</emph> for instructions             .\n.........................................."
    })

    // a máquina de áudio
    var runtime = null;

    // uma base de dados dummy
    var environment = {
	tau: "var tau = 2*Math.PI;",
    }
    var current = null;
    var scope = {}

    // Registros de variaveis
    var register_string_as_fn = function(name, cb){
	environment[name] = cb
    }

    var register_fn = function(name, cb){
	_cb = "var "+name+" = "+cb.toString()+";\n"
	environment[name] = _cb
    }

    // -----------------------
    // REGISTROS
    // -----------------------
    register_fn("tmod", function(f, t){
	return t % (1 / f) * f
    });
    register_fn("mute", function(){ 
	return 0 
    });
    register_fn("stereo", function(fn){
        var c = [0,0]
        for(var i=0; i<c.length; i++){
	    c[i] = fn(i);
        };
        return c
    });
    register_fn("sin", function(f, a){ 
	return a*Math.sin(tau*f*t)
    });
    register_fn("sin2", function(f, a){
        var fn = function fn(i){
            var amp = typeof(a) === 'object'?a[i]:a;
            var tmp = typeof(t) === 'object'?t[i]:t;
	    return sin(f[i], amp, tmp)
	}
        return stereo(fn);
    });
    register_fn("saw", function(f, a){
	return (1 - 2 * tmodf(f, t))* a;
    });
    register_fn("ramp", function(f, a){
	return (2 * tmodf(f, t) - 1) * a
    });
    register_fn("tri", function(f, a){
	return (Math.abs(1 - (2 * t * f) % 2) * 2 - 1) * a
    });
    register_fn("sqr", function(f, a){
	return ((t*f % 1/f < 1/f/2) * 2 - 1) * a
    });
    register_fn("pulse", function(f, a, w){
	return ((t*f % 1/f < 1/f/2*w) * 2 - 1) * a
    });
    register_fn("noise", function(a){
	return a*(Math.random()*2-1)
    });
    register_fn("perc", function(input, head, measure, decay, release){
	var a = next_event(head,measure,t);
	var b = 1/decay;
	var c = 1/release;
	return input * Math.exp(-a*b*Math.exp(a*c))
    });
    register_fn("next_event", function(head, measure){
	return (t/head)%measure
    });
    register_fn("test", function(){
	var s = sin(440,1,t)
	return perc(s,1,1,0.5,0.15,t)
    });
    register_fn("seq", function(a){
        return a[Math.floor(t%a.length)]
    });

    // ---------------------------
    // FIM REGISTROS
    // ---------------------------

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
		msg = "Páginas\n"+
		    "tutorial\t\tcomandos\n"+
		    "  (1) help tutorial\n"+
		    "  (2) help comandos\n"+
		    "  (3) help [comando]"
	    }
	    if(args[1] === "tutorial"){
		if(args[2] === undefined){
		    msg = "Tutoriais:\n"+
			"  help tutorial 0 - síntese por operações matemáticas\n"+
			"  help tutorial 1 - síntese com módulos pré-definidos\n"+
			"  help tutorial 2 - tocando e parando\n"+
			"  help tutorial 3 - gravando e fazendo download\n"+
			"  help tutorial 4 - tocando notas e ritmos"
		}
		if(args[2] === "0"){
		    msg = "Este ambiente aceita operações matemáticas para o DSP:"+
			" (1) Executando um ruído branco: \n"+
			"     wavepot> Math.random()*2 - 1\n\n"+
			"Existe variaveis chamadas 't' (tempo) e 'tau' (2PI) que podem ser usadas para controlar ondas periódicas:\n"+
			" (2) Executando uma senoide com lá de orquestra:\n"+
			"     wavepot> Math.sin(tau*440*t)\n\n"+
			" (3) Silêncio\n"+
			"     wavepot> 0"
		    
		}
		if(args[2] === "1"){
		    msg = "Algumas operações matemáticas estão definidas em funções, onde cada uma representa um m[odulo-padrão em DSP:\n"+
			"Para ver cada uma utilize o comando 'inspect' ou 'inspect [módulo].\n"+
			"  (1) Senoide 440 Hz:\n"+
			"      wavepot> sin(440, 0.71)\n"+
			"  (2) Dente-de-serra 440 Hz\n"+
			"      wavepot> saw(440, 0.71)\n"+
			"  (3) Ruído-branco\n"+
			"      wavepot> noise(0.71)\n"+
			"  (4) Silêncio\n"+
			"      wavepot> mute()"
		}
		if(args[2] === "2"){
		    msg = "Mesmo executando os procedimentos anteriores, não ouvimos nada.\n"+
			"Para tocar algum som, é necessário executar o comando 'play':\n"+
			"  (1) wavepot> sin(440,1)\n"+
			"      wavepot> play\n\n"+
			"Outra opção é tocar antes de executar algum módulo\n"+
			"  (2) wavepot> play\n"+
			"      wavepot> sin(440, 1)"
		}
		if(args[2] === "3"){
		    msg = "Podemos gravar; assim como o comando play, ele pode ser chamado antes de qualquer outro.\n"+
			"  Deve ser usado em conjunto com 'export'; este disponibilizará um player embutido e um link para download(que pode ser realizado clicando com o botão direito do mouse em 'Download' e escolhendo a opção 'Salvar como'; por enquanto, no menu do 'Salvar como' Será necessário adicionar a extensão '.wav').\n"+
			"  (1) wavepot> sin(440, 1)\n"+
			"      wavepot> play\n"+
			"      wavepot> record\n"+
			"      wavepot> export\n"+
			"  (2) wavepot> play\n"+
			"      wavepot> sin(440, 1)\n"+
			"      wavepot> record\n"+
			"      wavepot> export\n"+
			"  (3) wavepot> play\n"+
			"      wavepot> record\n"+
			"      wavepot> sin(440, 1)\n"+
			"      wavepot> export\n"+
			"  (4) wavepot> record\n"+
			"      wavepot> play"+
			"      wavepot> sin(440, 1)\n"+
			"      wavepot> export\n"+
			"  (5) wavepot> record\n"+
			"      wavepot> sin(440, 1)\n"+
			"      wavepot> play\n"+
			"      wavepot> export\n"
		}
		if(args[2] === "4"){
		    msg = "Existe uma função chamada 'perc'; ela cria um loop de notas percutidas; \n"+
			"  (1) wavepot> inspect perc\n"+
			"      wavepot> perc(sin(440,1), 1, 2, 0.1, 0.9\n"+
			"      wavepot> play\n"+
			"\nExiste outra função chamada 'seq'; ela cria uma sequencia de notas; bom para ser usado junto com perc\n"+
			"  (2) wavepot> play\n"+
			"      wavepot> perc(sin(seq([404,504]),1), 1, 0.5, 0.1, 0.3)\n"+
			"  (3) Uma melodia com permutações\n"+
			"      wavepot> perc(sin(seq([404,504,604]),sin(seq([204,304,404, 504]),1)), 1, 1, 0.1, 0.3)\n"+
			"  (4) Um contraponto de duas vozes:\n"+
			"      wavepot> perc(sin(seq([404,504,604]),sin(seq([204,304,404, 504]),1)), 0.2125, 0.0016255, 0.1, 0.3)"
		}
	    }
	    else if(args[1] === "comandos"){
		msg = "Comandos disponíveis\n"
		var a = ["play", "stop", "pause", "reset", "def", "inspect", "record", "export"];
		for(var c in a){
		    msg += (a[c]+" ")
		}    
            }
            else if(args[1] === "play"){
            msg = "Tocar.\nEste comando pode ser usado antes ou depois de definir um módulo de áudio\n"+
                "---------------\n"+
                "retorna BOOLEAN"
            }
            else if(args[1] === "stop"){
            msg = "Parar o processamento de audio.\n"+
                "---------------\n"+
                "retorna BOOLEAN"
            }
            else if(args[1] === "pause"){
            msg = "Pausa processamento o audio\n"+
                "---------------\n"+
                "retorna BOOLEAN"
            }
            else if(args[1] === "reset"){
             msg = "Reinicia o processamento\n"+
                "---------------\n"+
                "retorna FLOAT"
            }
            else if(args[1] === "record"){
             msg = "Grava o processamento de áudio\n"+
                "---------------\n"+
                "retorna BOOLEAN"
            }
            else if(args[1] === "export"){
             msg = "Exporta o que foi gravado para um player embutido\n"+
                "e fica disponível para download\n"+
                "---------------\n"+
                "retorna BOOLEAN"
            }
            else if(args[1] === "def"){
		msg = "O comando def define uma nova função"+
		    "  def [função e argumentos] [operação]\n"+
		    "      (1) Define um número randômico inteiro \n"+
		    "          wavepot> def funcao(maximo) Math.floor(Math.random()*maximo)\n"+
		    "          wavepot> inspect funcao\n"+
		    "            var funcao = function(maximo){\n"+
		    "              return Math.floor(Math.random()*maximo)\n"+
		    "            }\n"+
                    "      (2) Define um som padrao\n"+
		    "          wavepot> def padrao() sin(440,1)\n"+
		    "          wavepot> inspect padrao\n"+
		    "            var padrao = function(){\n"+
		    "              return sin(440,1)\n"+
		    "            }\n"+
		    "        retorna uma soma do argumento mais 1\n"+
		    "      (3) Define uma síntese AM simples\n"+
		    "          wavepot> def am(portadora, moduladora) sin(portadora,1) * sin(moduladora, 1)\n"+
		    "          OU\n"+
		    "          wavepot> def am(portadora, moduladora) sin(portadora, sin(moduladora, 1))\n"+
		    "          VARIANDO AM\n"+
		    "          wavepot> def am(portadora, moduladora, index) sin(portadora, sin(moduladora, index))"
            }
            else if(args[1] === "inspect"){
             msg = "Inspeciona os módulos disponíveis\n"+
                "Se for dado um argumento, procurará se este existe;\n em caso positivo mostra o código fonte\n"+
                "  exemplo:\n"+
                "    (1) inspect\n"+
                "    (2) inspect noise\n"
		"    (3) inspect sin"
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
	    
	    split = args[1].split("(")
	    name = split[0]
	    _arg = split[1]
	    cb = "var "+name+" = function("+_arg;
	    id = 0;
	    for(var i=2; i<args.length && args.length >2; i++){
		cb += ""+args[i];
		if(args[i].indexOf(")") > 0){
		    id = i+1;
		    break;
		}	
	    }
	    cb += "{\n  return ";
	    for(var i=id; i<args.length && args.length >id; i++){
		cb += ""+args[i];
	    }
	    cb += ";\n};";
	    
	    register_string_as_fn(name, cb)
	    return {
		type: 'print',
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
//        if(args[0] === "exe"){
        // Se algum comando for diferente
	// dos anteriores, interpretar como
	// Uma execução de um módulo de áudio
	// (ver inspect)
	else{
//            var p = [];
//            if(args.length === 3) p.push(args[2]);
//            if(args.length > 3) p = args.slice(2, args.length)
//            current = {callback: args[1], params: p};
//            return {
//            type: 'print',
//            callback: args[1],
//            params: p
//            }
	    cb = "\nreturn "+args[0]+"";
	    for(var i=1; i<args.length && args.length >1; i++){
		cb += ""+args[i];
	    }

	    //Memorizar o código corrente
	    //Para poder utilizar como módulo
	    //definido pelo usuário
	    //assim n precisa ficar escrevendo
	    //um monte de função
	    current = args[0].split("(")[0]

	    // Esta é a função que vai ser o ambiente 'environment'
	    // concatenado em uma única string
	    // TODO minificar com ugly.js?
	    envir=""
	    for(var v in environment){
		envir += (environment[v]+"\n");
	    }
            
	    envir += "var dsp = function(t){\n\t"+cb+"\n};";
            
	    // Descomente se quiser ver tudo: debug
	    //window.console.log(envir);
	    return {
		type: 'print',
		out: runtime.compile(envir)
	    }

        }   
      }
    }
  )   
})
    

