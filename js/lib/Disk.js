define(['lib/Vector','lib/Particle'],function(Vector,Particle){
  "use strict";

  function Disk(field, nparticles) {
    this.position     = field.position;
    this.radius        = 2;
    this.particleLife = -1;
    this.dTh       = 2 * Math.PI * this.radius / nparticles;
  }

  Disk.prototype.addParticle = function(x, y, vx, vy){
    var particle = new Particle(new Vector(x, y), new Vector(vx, vy));
    particle.ttl = this.particleLife;
    return particle;
  };
  
  Disk.prototype.addAll = function(){
    var Th = 0;
    for (var i = 0; i < nparticles; i++){
            Th += this.dTh;
            var particlex = position.x + (rad*Math.cos(Th));
            var particley = poistion.y + (rad*Math.sin(Th));
            var particle = new Particle(new Vector(particlex, particley),
                                        new Vector(0, 2));
        }
    };
  
  return Disk;
});