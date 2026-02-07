import stream from "stream";
import { getContainer } from "./container.manager.js";
import { supabase } from "../../config/supabase.js";

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
