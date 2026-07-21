"use client";

import Link from "next/link";
// SSE용 클라이언트 페이지.
// 브라우저 내장 EventSource 로 /api/sse 에 연결해서 서버가 푸시하는 이벤트를 화면에 쌓는다.
// 직접 고쳐보며 실습하기 좋은 출발점이다 (이벤트 이름 바꾸기, JSON 파싱, 재연결 관찰 등).

import { useEffect, useRef, useState } from "react";

interface LogEntry {
  id: number;
  text: string;
}

const SSE_URL = "/api/sse";

export default function SsePracticePage() {
  const [status, setStatus] = useState<"idle" | "open" | "closed">("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const sourceRef = useRef<EventSource | null>(null);
  const seqRef = useRef(0);

  const appendLog = (text: string) => {
    seqRef.current += 1;
    const id = seqRef.current; // 호출 시점의 값을 고정한다 (updater 안에서 읽으면 안 됨)
    setLogs((prev) => [{ id, text }, ...prev].slice(0, 50));
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const disconnect = () => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setStatus("closed");
  };

  // 페이지 떠날 때 연결 정리.
  useEffect(() => {
    const eventStream = new EventSource(SSE_URL);

    eventStream.onopen = () => {
      setStatus("open");
    };

    eventStream.onmessage = (event) => {
      // event 필드가 없는 기본 메시지
    };

    eventStream.addEventListener("tick2", function (event) {
      const data = JSON.parse(event.data);
      appendLog(`현재시각 : ${data.time}, count: ${data.count}`);
    });

    eventStream.onerror = () => {
      setStatus(eventStream.readyState === EventSource.CLOSED ? "closed" : "open");
    };

    return () => {
      eventStream.close();
      console.log("@cleanup");
    };
  }, []);

  return (
    <main style={{ fontFamily: "monospace", padding: 24, maxWidth: 720 }}>
      <h1>SSE 실습</h1>
      <p>
        상태: <strong>{status}</strong> · 엔드포인트: <code>{SSE_URL}</code>
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Link href="/ssg">ssg로가기</Link>
        <button onClick={disconnect} disabled={status !== "open"}>
          끊기
        </button>
        <button onClick={clearLogs}>로그 비우기</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, lineHeight: 1.7 }}>
        {logs.map((log) => (
          <li key={log.id}>
            {log.id}. {log.text}
          </li>
        ))}
      </ul>
    </main>
  );
}
