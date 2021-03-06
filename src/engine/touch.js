
export class Touch{
    constructor(id,x,y){
        this.id = id
        this.begin = {x, y}
        this.beginAt = Date.now()
        this.current = {x, y}
        this.currentAt = this.beginAt
        this.delta = {x:0,y:0}
        this.interval = 0
        this.inviter = []
        this.handle = false
        this.swallow = false
    }

    _moveTo(x,y){
        if(x == this.current.x && y == this.current.y)return
        var last = this.current
        var lastAt = this.currentAt
        this.current = {x,y}
        this.currentAt = Date.now()
        this.delta = {
            x: this.current.x - last.x,
            y: this.current.y - last.y,
        }
        this.interval = this.currentAt - lastAt
    }

    get distance(){
        var dx = this.current.x - this.begin.x
        var dy = this.current.y - this.begin.y
        return Math.sqrt(dx*dx+dy*dy)
    }
}

export class TouchManager{
    static addon(engine){
        engine.touchManager = new TouchManager(engine)
    }

    constructor(engine){
        this.engine = engine
        this.touch = null
        this.handlers = {
            begin:this._onTouchBegin.bind(this),
            move: this._onTouchMove.bind(this),
            end:this._onTouchEnd.bind(this),
            cancel:this._onTouchCancel.bind(this)
        }
        this.layers = []
        this.layerNodes = {}
        this.layerNodeMap = new Map()
        this._addListener()
    }

    addLayer(layerIndex,node){
        if(this.layers.indexOf(layerIndex) == -1){
            this.layers.push(layerIndex)
            this.layers.sort()
            this.layerNodes[layerIndex.toString()] = []
        }
        this.layerNodes[layerIndex.toString()].push(node)
        this.layerNodeMap.set(node,layerIndex)
    }

    removeLayer(node){
        var layerIndex = this.layerNodeMap.get(node)
        if(layerIndex === undefined){
            return
        }
        this.layerNodeMap.delete(node)
        var layer = this.layerNodes[layerIndex.toString()]
        if(!layer){
            return
        }
        var index = layer.indexOf(node)
        if(index>=0){
            layer.splice(index,1)
        }
    }

    _addListener(){
        wx.onTouchStart(this.handlers.begin)
        wx.onTouchMove(this.handlers.move)
        wx.onTouchEnd(this.handlers.end)
        wx.onTouchCancel(this.handlers.cancel)
    }

    _removeListener(){
        wx.offTouchStart(this.handlers.begin)
        wx.offTouchMove(this.handlers.move)
        wx.offTouchEnd(this.handlers.end)
        wx.offTouchCancel(this.handlers.cancel)
    }

    _onTouchBegin(args){
        if(!this.engine.updateTimer){
            return
        }
        if(this.touch != null){
            return
        }
        if(args.changedTouches.length <= 0){
            return
        }

        var raw = args.changedTouches[0]

        this.touch = new Touch(raw.identifier,raw.pageX*this.engine.scale.x,raw.pageY*this.engine.scale.y)

        for(var i = 0;i<this.layers.length;i++){
            var layer = this.layerNodes[this.layers[i]]
            for(var j =0;j<layer.length;j++){
                this.touch.handle = false
                this.touch.swallow = false
                var result = layer[j].onTouchBegin(this.touch)
                if(result === true || this.touch.handle){
                    if(this.touch.swallow){
                        for(var k = 0;k< this.touch.inviter.length;k++){
                            if(this.touch.inviter[k].onTouchCancel){
                                try{
                                    this.touch.inviter[k].onTouchCancel(this.touch)
                                }
                                catch(e){
                                    console.error(e)
                                }  
                            }
                        }
                        this.touch.inviter = [layer[j]]
                        return
                    }else{
                        this.touch.inviter.push(layer[j])
                    }
                }
            }
        }
    }
    _onTouchMove(args){ 
        if(!this.engine.updateTimer){
            return
        }
        if(this.touch == null){
            return
        }
        if(args.changedTouches.length <= 0){
            return
        }
        var raw = null
        for(var i =0;i<args.changedTouches.length;i++){
            if(args.changedTouches[i].identifier == this.touch.id){
                raw = args.changedTouches[i]
            }
        }
        if(raw == null){
            return
        }
        this.touch.swallow = false
        // var now = Date.now()
        this.touch._moveTo(raw.pageX*this.engine.scale.x,raw.pageY*this.engine.scale.y)
        // }
        
        for(var k = 0;k< this.touch.inviter.length;k++){
            if(this.touch.inviter[k].onTouchMove){
                try{
                    this.touch.inviter[k].onTouchMove(this.touch)
                }
                catch(e){
                    console.error(e)
                } 
                
                if(this.touch.swallow){
                    for(var i = 0;i< this.touch.inviter.length;i++){
                        if(i == k){
                            continue
                        }
                        if(this.touch.inviter[i].onTouchCancel){
                            try{
                                this.touch.inviter[k].onTouchCancel(this.touch)
                            }
                            catch(e){
                                console.error(e)
                            } 
                        }
                    }
                    this.touch.inviter = [this.touch.inviter[k]]
                    return
                }
            }
        }
    }
    _onTouchEnd(args){
        if(this.touch == null){
            return
        }
        if(args.changedTouches.length <= 0){
            return
        }
        var raw = null
        for(var i =0;i<args.changedTouches.length;i++){
            if(args.changedTouches[i].identifier == this.touch.id){
                raw = args.changedTouches[i]
            }
        }
        if(raw == null){
            return
        }
        this.touch._moveTo(raw.pageX*this.engine.scale.x,raw.pageY*this.engine.scale.y)
        for(var k = 0;k< this.touch.inviter.length;k++){
            if(this.touch.inviter[k].onTouchEnd){
                try{
                    this.touch.inviter[k].onTouchEnd(this.touch)
                }
                catch(e){
                    console.error(e)
                } 
            }
        }

        if(this.touch.distance < 20 && this.touch.currentAt - this.touch.beginAt < 350){
            for(var k = 0;k< this.touch.inviter.length;k++){
                if(this.touch.inviter[k].onTouchTap){
                    try{
                        this.touch.inviter[k].onTouchTap(this.touch)
                    }
                    catch(e){
                        console.error(e)
                    } 
                }
            }
        }

        this.touch = null
    }
    _onTouchCancel(args){
        if(this.touch == null){
            return
        }
        if(args.changedTouches.length <= 0){
            return
        }
        var raw = null
        for(var i =0;i<args.changedTouches.length;i++){
            if(args.changedTouches[i].identifier == this.touch.id){
                raw = args.changedTouches[i]
            }
        }
        if(raw == null){
            return
        }
        for(var k = 0;k< this.touch.inviter.length;k++){
            if(this.touch.inviter[k].onTouchCancel){
                this.touch.inviter[k].onTouchCancel(this.touch)
            }
        }
        this.touch = null
    }
}