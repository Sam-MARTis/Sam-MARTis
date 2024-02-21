const doFlowField = () => {
  let canvas;
  let ctx;
  let flowfield;
  let flowfieldanimation;
  let mouseX = window.width / 2;
  let mouseY = window.height / 2;
  let xRand = Math.random();
  let yRand = Math.random();
  window.addEventListener("load", () => {
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    ctx.lineWidth = 100;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.8;
    flowfield = new FlowFieldEffect(
      ctx,
      window.innerWidth,
      window.innerHeight * 0.8
    );
    flowfield.animate();
  });
  const canvasResize = () => {
    cancelAnimationFrame(flowfieldanimation);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.8;
    // console.log("canvasResize");
    flowfield = new FlowFieldEffect(
      ctx,
      window.innerWidth,
      window.innerHeight * 0.8
    );

    flowfield.animate();
  };
  const mouseMove = (e) => {
    // console.log(e);
    mouseX = e.clientX;
    mouseY = e.clientY;
    // console.log(e);
  };

  addEventListener("resize", canvasResize);
  addEventListener("mousemove", mouseMove);

  class FlowFieldEffect {
    #ctx;
    #width;
    #height;

    constructor(ctx, width, height) {
      this.x = width / 2;
      this.y = height / 2;
      this.angle = 0;
      this.#ctx = ctx;
      this.#width = width;
      this.#height = height;
      this.#ctx.strokeStyle = "#FFFFFF";
      this.cellsize = 35;
      this.scale = 0.5;
      // console.log("Loaded");

      // this.#draw(10, 10)
    }


    #draw = (x, y, posx, posy) => {
      this.#ctx.beginPath();
      ctx.lineWidth = 1.5;
      this.#ctx.moveTo(posx, posy);

      let t = Date.now() / 500;
        let angle =
          (Math.sin((posx / 100) ** (0.5 + xRand / 2)) -
            Math.cos((posy / 100) ** (0.5 + yRand / 2)) +
            t) %
          6.28;
      
        let scaleToDraw = Math.abs(1+ 3* (angle / 6.28) * (1 - angle / 6.28));
      this.#drawAngle(angle, posx, posy, 10* scaleToDraw);
      // }
    };
    #drawAngle = (angle, posx, posy, scale) => {
      const length = scale;
      this.#ctx.beginPath();
      this.#ctx.moveTo(posx, posy);

      // console.log(mag);
      let lambda = (-angle * (angle - 6.28)) / 100;
      this.#ctx.strokeStyle = `rgb(${(1 - lambda) * 255}, 0, ${lambda * 255})`;
      this.#ctx.lineTo(
        posx + length * Math.cos(angle),
        posy + length * Math.sin(-angle)
      );

      this.#ctx.stroke();
    };
    animate = () => {
      this.#ctx.clearRect(0, 0, this.#width, this.#height);
      for (let i = 0; i < this.#width; i += this.cellsize) {
        for (let j = 0; j < this.#height; j += this.cellsize) {
          // this.#drawAngle(this.angle+(i+j)/400, i, j, 1);
          this.#draw(mouseX, mouseY, i, j, this.scale);
        }
      }
      // this.#draw(3, 3, this.#width/2 , this.#height/2);
      // this.#drawAngle(this.angle, this.#width/2, this.#height/2)
      this.angle += 0.1;
      // this.x+=0.1;
      // x+=1;
      // console.log("Animating");
      flowfieldanimation = requestAnimationFrame(this.animate.bind(this));
    };
  }
};

doFlowField();
