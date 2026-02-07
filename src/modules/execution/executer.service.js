import stream from "stream";
import { getContainer } from "./container.manager.js";
import { supabase } from "../../config/supabase.js";

/**
 * Create an interactive TTY exec session in the container; stream I/O to the socket.
 * @param {string} containerId
 * @param {import('ws').WebSocket} socket - must send JSON { type: 'terminal.output', payload: { data } }
 * @param {{ cols: number, rows: number }} size
 * @returns {{ write: (data: string) => void, resize: (cols: number, rows: number) => void, destroy: () => void }}
 */
export async function createInteractiveExec(containerId, socket, size = { cols: 80, rows: 24 }) {
  const container = await getContainer(containerId);
  const exec = await container.exec({
    Cmd: ['sh', '-i'],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: true,
  });

  const execStream = await exec.start({
    hijack: true,
    stdin: true,
  });

  execStream.on('data', (chunk) => {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({ type: 'terminal.output', payload: { data: chunk.toString() } }));
    }
  });

  execStream.on('end', () => {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({ type: 'terminal.close' }));
    }
  });

  execStream.on('error', (err) => {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({ type: 'terminal.output', payload: { data: `\r\nError: ${err.message}\r\n` } }));
    }
  });

  const resize = (cols, rows) => {
    exec.resize({ w: cols, h: rows }).catch(() => {});
  };
  resize(size.cols, size.rows);

  return {
    write(data) {
      if (execStream.writable && !execStream.destroyed) execStream.write(data);
    },
    resize,
    destroy() {
      try {
        execStream.destroy();
      } catch (_) {}
    },
  };
}

export async function runCode(workspaceId, code) {
    const { data, error } = await supabase.from('workspaces').select('containerId').eq('id', workspaceId).single();
    if (error) {
        throw new Error(error.message);
    }
    const containerId = data.containerId;
    const container = await getContainer(containerId);

    // Create exec
    const exec = await container.exec({
        Cmd: ["sh", "-c", code],
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: false
    });

    // Start exec with stream
    const execStream = await exec.start({
        hijack: true,
        stdin: false
    });

    let stdout = "";
    let stderr = "";

    // Writable streams to capture output
    const stdoutStream = new stream.Writable({
        write(chunk, encoding, callback) {
            stdout += chunk.toString();
            callback();
        }
    });

    const stderrStream = new stream.Writable({
        write(chunk, encoding, callback) {
            stderr += chunk.toString();
            callback();
        }
    });

    // Demux Docker stream
    container.modem.demuxStream(
        execStream,
        stdoutStream,
        stderrStream
    );

    // Wait for execution to finish
    await new Promise((resolve, reject) => {
        execStream.on("end", resolve);
        execStream.on("error", reject);
    });

    // Get exit code
    const inspect = await exec.inspect();

    return {
        stdout,
        stderr,
        exitCode: inspect.ExitCode
    };
}
