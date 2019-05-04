/*global require, dat*/

require.config({
  deps : ['vendor/Events', 'vendor/lodash']
});

require(
  [
    'lib/ParticleSystem',
    'lib/Display',
    'lib/Vector'
  ],
  function(ParticleSystem, Display, Vector, GUI){
    "use strict";

    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize); resize();

    var display = new Display(document.getElementById('canvas'));
    display.init();
    var particleSystem = new ParticleSystem().init(display);
    display.start();

    /*var gui = new GUI(particleSystem, display);*/

    /*particleSystem.addEmitter(new Vector(700,170),Vector.fromAngle(0,2));*/
    particleSystem.addField(new Vector(700,430), 4000);
    particleSystem.addParticleDisk(700,430);

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

  }
);

