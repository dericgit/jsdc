define(function(require, exports, module) {
  var homunculus = require('homunculus');
  var JsNode = homunculus.getClass('Node', 'es6');
  var Token = homunculus.getClass('Token');
  
  var Class = require('./util/Class');
  var join = require('./join');
  
  var Forof = Class(function(jsdc) {
    this.jsdc = jsdc;
    this.hash = {};
  }).methods({
    parse: function(node, start) {
      //有可能被Generator中该写过
      if(node.gen) {
        return;
      }
      if(start) {
        var of = node.leaf(3);
        if(node.first().token().content() == 'for'
          && of.name() == JsNode.TOKEN
          && of.token().content() == 'of') {
          //存放临时li供block首尾改写引用
          this.hash[node.nid()] = {
            temp: this.jsdc.uid()
          };
          this.jsdc.ignore(of, 'forof1');
        }
      }
      else if(this.hash.hasOwnProperty(node.nid())) {
        var last = node.last();
        var s = '';
        if(!this.jsdc.endsWith(';')
          && !this.jsdc.endsWith(':')
          && !this.jsdc.endsWith('{')
          && !this.jsdc.endsWith('\n')) {
          s = ';';
        }
        s += this.hash[node.nid()].id + '=' + this.hash[node.nid()].temp;
        if(last.name() != JsNode.BLOCKSTMT) {
          //临时引用写回，使循环正常
          this.jsdc.appendBefore(s);
          //}闭合
          this.jsdc.appendBefore('}');
        }
        else {
          this.jsdc.insert(s, this.jsdc.res.length - 1);
        }
      }
    },
    of: function(node) {
      var parent = node.parent();
      if(parent.name() == JsNode.ITERSTMT
        && this.hash.hasOwnProperty(parent.nid())) {
        this.jsdc.append('=');
      }
    },
    prts: function(node, start) {
      var parent = node.parent();
      if(parent.name() == JsNode.ITERSTMT
        && this.hash.hasOwnProperty(parent.nid())) {
        if(start) {
          this.jsdc.append('.next();!');
          var k = parent.leaf(2);
          //forof的varstmt只能有一个id，其它为mmbexpr
          var v = join(parent.leaf(4));
          if(k.name() == JsNode.VARSTMT) {
            k = k.last().first().first().token().content();
          }
          else {
            k = join(k);
          }
          this.jsdc.append(k + '.done;');
          this.jsdc.append(k + '=' + v + '.next()');
        }
        else {
          //for of的语句如果省略{}则加上
          var last = parent.last();
          if(last.name() != JsNode.BLOCKSTMT) {
            this.jsdc.appendBefore('{');
            this.assign(parent);
          }
        }
      }
    },
    block: function(node) {
      var parent = node.parent();
      if(parent.name() == JsNode.BLOCK) {
        parent = parent.parent();
        if(parent.name() == JsNode.BLOCKSTMT) {
          parent = parent.parent();
          if(parent.name() == JsNode.ITERSTMT
            && this.hash.hasOwnProperty(parent.nid())) {
            this.assign(parent);
          }
        }
      }
    },
    assign: function(node) {
      var k = node.leaf(2);
      //forof的varstmt只能有一个id，其它为mmbexpr
      if(k.name() == JsNode.VARSTMT) {
        k = k.last().first().first().token().content();
      }
      else {
        k = join(k);
      }
      //先存下临时引用
      var o = this.hash[node.nid()];
      o.id = k;
      this.jsdc.append('var ' + o.temp + '=' + k + ';');
      this.jsdc.append(k + '=' + o.temp + '.value;');
    }
  });
  
  module.exports = Forof;
});