const doFlowField_Proj = () => {
  let flowCanvas;
  let flowContainerMine;
  let flowCtx;
  let flowfield;
    let flowfieldAnimation;
    let xRand = Math.random();
    let yRand = Math.random();
  let mouseX = window.width / 2;
    let mouseY = window.height / 2;
    let time = Date.now();
  window.addEventListener("load", () => {
    flowCanvas = document.getElementById("canvas3");
    flowCtx = flowCanvas.getContext("2d");
    flowCtx.lineWidth = 100;

    flowCanvas.width = window.innerWidth;
    flowCanvas.height = window.innerHeight * 0.8;
    flowfield = new FlowFieldEffect(
      flowCtx,
      window.innerWidth,
      window.innerHeight * 0.8
    );
    canvasResize();
  });
  const canvasResize = () => {
    flowContainerMine = document.getElementById("projectContainer");
    flowCtx = flowCanvas.getContext("2d");

    let containerWidth = flowContainerMine.offsetWidth;
    let containerHeight = flowContainerMine.offsetHeight;

    flowCanvas.width = containerWidth * devicePixelRatio;
      flowCanvas.height = containerHeight * devicePixelRatio;
      flowCanvas.style.width = containerWidth + "px";
      flowCanvas.style.height = containerHeight-100 + "px";

    cancelAnimationFrame(flowfieldAnimation);
    // console.log("canvasResize");
    flowfield = new FlowFieldEffect(
      flowCtx,
      containerWidth,
      containerHeight * 0.8
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
    #flowCtx;
    #width;
    #height;

    constructor(flowCtx, width, height) {
      this.x = width / 2;
      this.y = height / 2;
      this.angle = 0;
      this.#flowCtx = flowCtx;
      this.#width = width;
      this.#height = height;
      this.#flowCtx.strokeStyle = "#FFFFFF";
      this.cellsize = 35;
      this.scale = 0.5;
      // console.log("Loaded");

      // this.#draw(10, 10)
    }

    #draw = (x, y, posx, posy) => {
      this.#flowCtx.beginPath();
      flowCtx.lineWidth = 2.5;
      this.#flowCtx.moveTo(posx, posy);

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
      this.#flowCtx.beginPath();
      this.#flowCtx.moveTo(posx, posy);

      // console.log(mag);
        let lambda = 1 -(Math.min(scale / 20, 1))**2;
        
      this.#flowCtx.strokeStyle = `rgb(${(1 - lambda) * 255}, 0, ${
        lambda * 255
      })`;
      this.#flowCtx.lineTo(
        posx + length * Math.cos(angle),
        posy + length * Math.sin(-angle)
      );

      this.#flowCtx.stroke();
    };
    animate = () => {
      this.#flowCtx.clearRect(0, 0, this.#width, this.#height);
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
      flowfieldAnimation = requestAnimationFrame(this.animate.bind(this));
    };
  }
};

doFlowField_Proj();
