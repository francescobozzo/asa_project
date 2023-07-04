import argparse
from multiprocessing import Process
import os
from time import sleep

TOKENS = [
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI1YjEwZTgzYjcyIiwibmFtZSI6ImZlZGVyaWNvIiwiaWF0IjoxNjg3Njc5Nzk5fQ.yDIqds8Luux5znmjmbHdu9CJS1j22u_e1hcy1UnyrKc",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIzYzM2YzRlZDVhIiwibmFtZSI6ImZyYW5jZXNjbyIsImlhdCI6MTY4NzY4NzAzM30.Fli5MqqQE89jz3xTcReAdKjljzVWLj0pN6_prERKPfM",
]


def run_deliveroo_env(deliveroo_dir, challenge):
    os.system(f"cd {deliveroo_dir} && node index.js {challenge}")


def run_agent(token):
    os.system(f"TOKEN={token} npm start")


def main(args):
    print("Deliveroo directory ", args.deliveroo_dir)
    print("Challenge file ", args.challenge)
    deliveroo_process = Process(
        target=run_deliveroo_env, args=(args.deliveroo_dir, args.challenge)
    )
    agent_processes = []
    tokens = args.tokens if args.tokens else TOKENS
    for token in tokens:
        agent_processes.append(Process(target=run_agent, args=(token,)))
    # deliveroo_process.start()
    sleep(1)
    for agent_process in agent_processes:
        agent_process.start()
        sleep(500 / 1000)  # 300 milliseconds
    agent_processes[0].join()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument("--deliveroo-dir", "-d", type=str, required=True)
    parser.add_argument("--challenge", "-c", type=str, required=True)
    parser.add_argument("--tokens", "-t", nargs="+", required=False)

    args = parser.parse_args()
    main(args)
