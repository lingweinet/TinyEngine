export function EventMixin(init){
    this._events = this._events || {}
    this.__mixinEvent__ = true
}
EventMixin.prototype.on = function(event,func){
    var listeners = this._events[event] || (this._events[event] = [])
    listeners.push({
        func: func,
        once: false,
    })
}
EventMixin.prototype.once = function(event,func){
    var listeners = this._events[event] || (this._events[event] = [])
    listeners.push({
        func: func,
        once: true,
    })
}
EventMixin.prototype.off = function(event,func){
    var listeners = this._events[event]
    if(!listeners || listeners.length === 0){
        return
    }
    if(func !== undefined){
        for(var i =0;i<listeners.length;i++){
            if(listeners[i].func == func){
                listeners.splice(i,1)
                return
            }
        }
    }else if(event != undefined){
        this._events[event] = []
    }else{
        this._events = {}
    }
}
EventMixin.prototype.emit = function(event,...args){
    var listeners = this._events[event]
    if(!listeners || listeners.length === 0){
        return
    }
    for(var i =0;i<listeners.length;i++){
        listeners[i].func.call(this,...args)
        if(listeners[i].once){
            listeners.splice(i,1)
            i--
        }
    }
}
