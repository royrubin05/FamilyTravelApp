
import 'dotenv/config';
import { logCronExecution, logCronExecution as log } from "../src/lib/system-health";
import { getSystemHealthLogs } from "../src/app/actions/system-health";

async function main() {
    console.log("Testing System Health Logging...");

    // 1. Write a log
    console.log("Writing test log...");
    await logCronExecution("/manual/test-script", "Success", 123);
    console.log("Write complete (or failed silently, check logs).");

    // 2. Read logs
    console.log("Reading logs...");
    const logs = await getSystemHealthLogs();
    console.log("Logs found:", logs.length);
    console.table(logs);

    if (logs.find(l => l.job === "/manual/test-script")) {
        console.log("SUCCESS: Test log verified.");
    } else {
        console.error("FAILURE: Test log not found.");
    }
}

main().catch(console.error);
