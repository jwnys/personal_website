(function(root){
  function toJSON(src){
    const entries=[];
    const entryRegex=/@([^\s{]+)\s*\{\s*([^,]+),(.*?)\}\s*(?=$|@)/gs;
    let match;
    while((match=entryRegex.exec(src))!==null){
      const entryType=match[1].trim();
      const citationKey=match[2].trim();
      const body=match[3];
      const entryTags={};
      const fieldRegex=/(\w+)\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|"(?:[^"\\]|\\.)*")/g;
      let field;
      while((field=fieldRegex.exec(body))!==null){
        let value=field[2].trim();
        if((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('"') && value.endsWith('"'))){
          value=value.slice(1,-1);
        }
        entryTags[field[1].toLowerCase()]=value;
      }
      entries.push({entryType,citationKey,entryTags});
    }
    return entries;
  }
  root.bibtexParse={toJSON};
})(typeof exports==='undefined'?this:exports);
