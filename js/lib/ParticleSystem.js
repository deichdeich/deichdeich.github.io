/*global define,_*/

(function() {

    /**
     * Returns a Gaussian Random Number around a normal distribution defined by the mean
     * and standard deviation parameters.
     *
     * Uses the algorithm used in Java's random class, which in turn comes from
     * Donald Knuth's implementation of the BoxÐMuller transform.
     *
     * @param {Number} [mean = 0.0] The mean value, default 0.0
     * @param {Number} [standardDeviation = 1.0] The standard deviation, default 1.0
     * @return {Number} A random number
     */
    Math.randomGaussian = function(mean, standardDeviation) {

        mean = defaultTo(mean, 0.0);
        standardDeviation = defaultTo(standardDeviation, 1.0);

        if (Math.randomGaussian.nextGaussian !== undefined) {
            var nextGaussian = Math.randomGaussian.nextGaussian;
            delete Math.randomGaussian.nextGaussian;
            return (nextGaussian * standardDeviation) + mean;
        } else {
            var v1, v2, s, multiplier;
            do {
                v1 = 2 * Math.random() - 1; // between -1 and 1
                v2 = 2 * Math.random() - 1; // between -1 and 1
                s = v1 * v1 + v2 * v2;
            } while (s >= 1 || s == 0);
            multiplier = Math.sqrt(-2 * Math.log(s) / s);
            Math.randomGaussian.nextGaussian = v2 * multiplier;
            return (v1 * multiplier * standardDeviation) + mean;
        }

    };

    /**
     * Returns a normal probability density function for the given parameters.
     * The function will return the probability for given values of X
     *
     * @param {Number} [mean = 0] The center of the peak, usually at X = 0
     * @param {Number} [standardDeviation = 1.0] The width / standard deviation of the peak
     * @param {Number} [maxHeight = 1.0] The maximum height of the peak, usually 1
     * @returns {Function} A function that will return the value of the distribution at given values of X
     */
    Math.getGaussianFunction = function(mean, standardDeviation, maxHeight) {

        mean = defaultTo(mean, 0.0);
        standardDeviation = defaultTo(standardDeviation, 1.0);
        maxHeight = defaultTo(maxHeight, 1.0);

        return function getNormal(x) {
            return maxHeight * Math.pow(Math.E, -Math.pow(x - mean, 2) / (2 * (standardDeviation * standardDeviation)));
        }
    };

    function defaultTo(value, defaultValue) {
        return isNaN(value) ? defaultValue : value;
    }

})();
define(
  [
    'lib/Vector',
    'lib/Field',
    'lib/Emitter',
    'lib/Particle'],
  function(Vector,Field,Emitter,Particle){
    "use strict";

    function ParticleSystem() {

      this.maxParticles = 2000;
      this.draw = {
        objects       : true,
        info          : true,
        accelerations : false,
        velocities    : false,
        particles     : true
      };
      this.particles = [];
      this.emitters = [];
      this.fields = [];
      this.elapsed = 0;
      this.mouseCoords = new Vector(0, 0);
      this.mouseFieldStrength = -140;
      this.mouseField = null;
      this.display = null;
    }

    function removeObject(type) {
      return function(index) {
        if (typeof index.constructor !== Number)  index = this[type].indexOf(index);
        var object = this[type].splice(index, 1);
        if (object) this.trigger('deleteObject', {particleTarget : object});
      };
    }
    _.extend(ParticleSystem.prototype, Backbone.Events, {
      init : function (display) {
        this.display = display;

        display.on('draw', this.onDraw, this);
        display.on('afterDraw', this.onAfterDraw, this);
        display.on('beforeUpdate', this.onBeforeUpdate, this);
        display.on('update', this.onUpdate, this);
        display.on('mouseUp', this.onMouseUp, this);
        display.on('mouseDown', this.onMouseDown, this);
        display.on('mouseMove', this.onMouseMove, this);
        return this;
      },
      addEmitter : function (point, velocity) {
        var emitter = new Emitter(point, velocity);
        this.emitters.push(emitter);
        this.trigger('newObject', {particleTarget : emitter});
      },
      addField : function (point, mass) {
        var field = new Field(point, mass);
        this.fields.push(field);
        this.trigger('newObject', {particleTarget : field});
      },
      removeEmitter : removeObject('emitters'),
      removeField : removeObject('fields'),
      onBeforeUpdate : function (evt) {
        if (this.draw.accelerations) this.drawAccelerations();
        if (this.draw.velocities)    this.drawVelocities();
      },
      onUpdate :  function (evt) {
        this.elapsed++;
        this.addNewParticles();
        this.plotParticles(this.display.width, this.display.height);
      },
      onDraw : function (evt) {
        if (this.draw.particles) this.drawParticles();
        if (this.draw.objects) {
          this.drawFields();
          this.drawEmitters();
          }
      },
      onAfterDraw : function (evt) {
        if (this.display.draw.info) {
          this.display.fillStyle("white");
          this.display.drawText("Particles : " + this.getParticleCount(), new Vector(100, this.display.height - 10), 100);
        }
      },
      onMouseDown : function (evt) {
        var object = this.getObjectAtPoint(this.mouseCoords);
        if (this.selected) {
          evt.particleTarget = this.selected;
          this.trigger('objectBlur', evt);
          this.selected = undefined;
        }
        if (object) {
          this.clicked = object;
          evt.particleTarget = object;
          this.trigger('objectMouseDown');
        } else {
          this.mouseField = new Field(this.mouseCoords, this.mouseFieldStrength);
          this.mouseField.size = 0;
          this.fields.push(this.mouseField);
        }
      },
      onMouseUp : function (evt) {
        var currentObject = this.getObjectAtPoint(this.mouseCoords);
        if (this.mouseField) {
          this.removeField(this.mouseField);
          this.mouseField = undefined;
        } else if (this.clicked) {
          evt.particleTarget = this.clicked;
          if (currentObject === this.clicked) {
            if (this.clicked.moved) {
              this.trigger('objectFinishMove', evt);
            } else {
              this.selected = this.clicked;
              this.trigger('objectClick', evt);
              this.trigger('objectFocus', evt);
            }
            delete this.clicked.moved;
            this.clicked = undefined;
          }
        }
      },
      onMouseMove : function (evt) {
        this.mouseCoords = new Vector(evt.offsetX || (evt.layerX - this.display.canvas.offsetLeft), evt.offsetY || (evt.layerY - this.display.canvas.offsetTop));
        if (this.mouseField) {
          this.mouseField.moveTo(this.mouseCoords);
        } else if (this.clicked) {
          this.clicked.moved = true;
          this.clicked.moveTo(this.mouseCoords);
        } else { // not over anything
          var object = this.getObjectAtPoint(this.mouseCoords);
          if (this.objectMouseOver !== object) { // if we're over something different
            if (this.objectMouseOver) {         // if we were over something before
              evt.particleTarget = this.objectMouseOver;
              this.trigger('objectMouseOut', evt);
              this.objectMouseOver = undefined;
            } else {                            // we're in *something* new, even if it's nothing
              evt.particleTarget = object;
              this.trigger('objectMouseIn', evt);
              this.objectMouseOver = object;
            }
          }
        }
      },
      addNewParticles : function () {
        if (this.particles.length > this.maxParticles) return;
        var emitParticles = function (emitter) {
          for (var i = 0; i < emitter.emissionRate; i++) this.particles.push(emitter.addParticle());
        }.bind(this);
        _(this.emitters).each(emitParticles);
      },
      addParticleDisk : function (px, py, nparticles, size) {
        var Th_dir = (Math.random()<0.5) ? -1 : 1;
        for (var i = 0; i < nparticles; i++){
            var r_dot = 0.;
            var plusminus =(Math.random()<0.5) ? -1 : 1;
            if (size == 1){
                if (Math.random()<0.5){
                    var Th = Math.randomGaussian(Math.PI/2,0.5);
                    var rad = Th * Math.randomGaussian(100,3)/1.5;
                }
                else{
                    var Th = Math.random()*Math.PI*2;
                    var rad = Math.randomGaussian(100,30);
                    Th += Math.randomGaussian(0.03, 0.3);
                    }
                rad += Math.randomGaussian(10,5);
                Th += Math.randomGaussian(0.03, 0.03);
            }
            else if (size == 2){
                var Th = Math.random()*Math.PI*2;
                var rad = Math.randomGaussian(100,30)
                rad += Math.randomGaussian(30,20)
                }
            else if (size == 3){
                var Th = Math.random()*Math.PI*2;
                var rad = Math.randomGaussian(100,30)
                rad += Math.randomGaussian(150,10)
            }
            var Th_dot = -Math.pow(this.fields[0].mass, 1/2) * Math.pow(rad, -3/2);
            if (plusminus == 1){
            Th += Math.PI;
            }
            r_dot += (Math.random()-0.5) / 1000;
            /*Th_dot += (Math.random()-0.5) / 10000;*/
            /*Th_dot *= Th_dir;*/
            var partx = px + rad * Math.cos(Th);
            var party = py + rad * Math.sin(Th);
            var partvx = r_dot * Math.cos(Th) - rad * Th_dot * Math.sin(Th);
            var partvy = r_dot * Math.sin(Th) + rad * Th_dot * Math.cos(Th);
            this.particles.push(new Particle(new Vector(partx, party),
                                             new Vector(partvx,
                                                        partvy),
                                             1));
        }
      },
      plotParticles : function (boundsX, boundsY) {
        var fields = this.fields;
        this.particles = _(this.particles).reject(function(particle){
          if (particle.ttl > 0 && ++particle.lived >= particle.ttl) return true;
          var p = particle.position;
          if (p.x < 0 || p.x > boundsX || p.y < 0 || p.y > boundsY) return true;
          particle.submitToFields(fields);
          particle.move();
        });
      },
      drawParticles : function () {
        var display = this.display;
        //display.context.globalCompositeOperation = 'darker';
        display.context.fillStyle = 'rgba(' + Particle.color.join(',') + ')';
        _(this.particles).each(function(particle){
          var size = particle.size;
          var point = particle.position;
          display.context.beginPath()
          display.context.arc(point.x,point.y,size,0, 2*Math.PI);
          display.context.fill();
        });
      },
      drawAccelerations : function () {
        var display = this.display;
        display.strokeStyle("red");
        display.context.beginPath();
        _(this.particles).each(function(particle){
          display.context.moveTo(particle.position.x, particle.position.y);
          display.context.lineTo(particle.position.x + particle.acceleration.x, particle.position.y + particle.acceleration.y);
        });
        display.context.stroke();
      },
      drawVelocities : function () {
        var display = this.display;
        display.strokeStyle("blue");
        display.context.beginPath();
        _(this.particles).each(function(particle){
          display.context.moveTo(particle.position.x, particle.position.y);
          display.context.lineTo(particle.position.x + particle.velocity.x, particle.position.y + particle.velocity.y);
        });
        display.context.stroke();
      },
      drawFields   : function(){ _(this.fields).each(this.drawCircularObject.bind(this)); },
      drawEmitters : function(){ _(this.emitters).each(this.drawCircularObject.bind(this)); },
      drawCircularObject : function (object) {
        var radius = object.size >> 1;
        var gradient = this.display.context.createRadialGradient(
          object.position.x, object.position.y, object.size,
          object.position.x, object.position.y, 0
        );
        gradient.addColorStop(0, object.drawColor || object.constructor.drawColor);
        gradient.addColorStop(1, object.drawColor2 || object.constructor.drawColor2);
        this.display.fillStyle(gradient);
        this.display.drawCircle(object.position, radius);
      },
      getObjectAtPoint : function (point) {
        var objects = _([].concat(this.emitters,this.fields)).filter(function(obj){
          return point.withinBounds(obj.position, obj.size);
        });
        return objects[0];
      },
      getParticleCount : function () { return this.particles.length; },
      getEmitterCount : function () { return this.emitters.length; },
      getFieldCount : function () { return this.fields.length; },
      toString : function () {
        var stateVersion = 1;
        var coreAttributes = [
          this.maxParticles,
          this.draw.objects ? 1 : 0,
          this.draw.accelerations ? 1 : 0,
          this.draw.velocities ? 1 : 0,
          this.draw.particles ? 1 : 0
        ];
        _(this.emitters).each(function(o){coreAttributes.push(o.toString());});
        _(this.fields).each(function(o){coreAttributes.push(o.toString());});
        return 'Sv' + stateVersion + '(' + coreAttributes.join('|') + ')';
      },
      // Sv#(string)
      fromString : function (string) {
        var versions = {
          Sv1 : this.loadStateV1
        };
        var matches = string.match(/^([^(]+)\((.*)\)$/);
        this.particles = [];
        if (matches && matches.length === 3 && versions[matches[1]]) versions[matches[1]].apply(this,[matches[2]]);
      },
      // maxP|draw.obj|draw.acc|draw.vel|draw.part|emitter|emitter|field|field
      loadStateV1 : function (string) {
        var parts = string.split('|');
        this.maxParticles = parseInt(parts.shift(),10);
        this.draw.objects = parts.shift() === "1" ? true : false;
        this.draw.accelerations = parts.shift() === "1" ? true : false;
        this.draw.velocities = parts.shift() === "1" ? true : false;
        this.draw.particles = parts.shift() === "1" ? true : false;
        this.emitters = [];
        this.fields = [];
        _(parts).each(function(objectString){
          if (objectString.charAt(0) === 'E') this.emitters.push(Emitter.fromString(objectString));
          else                                this.fields.push(Field.fromString(objectString));
        }.bind(this));
      }
    });
    return ParticleSystem;
  }
);

