import tty from "node:tty";
export default {
  async fetch() {
    return new Response("tty import succeeded");
  }
};
