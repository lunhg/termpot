function parse(string){
    var regexp = /def\s{1}[a-zA-Z0-9]+\([\w+\s\,]*\)/;
    var func = regexp.exec(string);

    var r = /\([\w+\s\,]*\)/
    var _arg = r.exec(func[0]);
    _arg = _arg[0];
    var name = func[0].split(r)[0].split("def")[1].split(" ")[1];
    body_doc = string.split(regexp);

    // Vai chegar uma função jquery
    // se chegar, é um slider
    reg1 = /\$\(\'\#\w+\'\)/;
    var body = null;
    var doc = null;
    if(reg1.test(body_doc[1])){
	body = body_doc[1]
	doc = "# Um slider para a função "+name
    }
    else{
	body_doc = body_doc[1].split("#")
	body = body_doc[0]
	doc = body_doc[1]
    }
    cb = "###\n"+doc+"\n###\n"+name+" = "+_arg+" -> "+body

    return {
	name: name,
	string: CoffeeScript.compile(cb, {bare: true})
    }
}
