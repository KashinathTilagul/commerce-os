---
name: the-book-of-secret-knowledge
description: Curated reference catalog of CLI one-liners, cheat sheets, security/pentesting tools, system diagnostics, network tricks, and DevOps manuals from trimstray/the-book-of-secret-knowledge.
---

# The Book of Secret Knowledge Skill

This skill provides a structured reference guide based on [the-book-of-secret-knowledge](https://github.com/trimstray/the-book-of-secret-knowledge) for system administration, DevOps, security auditing, shell one-liners, and performance debugging.

## When to Use

Use this skill when performing or diagnosing:
- **CLI & Shell One-Liners**: Text processing (`awk`, `sed`, `grep`, `jq`), file operations, process management.
- **Network & Security Audits**: Port scanning (`nmap`, `netstat`, `ss`, `lsof`), traffic inspection (`tcpdump`), TLS/SSL checks (`openssl`).
- **System Diagnostics**: Memory, CPU, disk IO, and process monitoring (`htop`, `dstat`, `vmstat`, `iostat`, `strace`, `lsof`).
- **DevOps & Infrastructure**: Docker/container debugging, CI/CD security hygiene, web server tuning (Nginx/Apache).

---

## 1. Essential One-Liners & CLI Patterns

### Network & Port Inspection
```bash
# Find listening ports and associated processes
sudo ss -tulpn

# Inspect open network connections for a process
lsof -i :3000

# Test TCP port connectivity quickly without telnet/nc
timeout 2 bash -c '</dev/tcp/127.0.0.1/3000' && echo "Open" || echo "Closed"

# Inspect SSL/TLS certificate details for a hostname
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl xargs -0 -I{} openssl x509 -noout -text
```

### System Performance & Troubleshooting
```bash
# Trace system calls of a running process
sudo strace -p <PID> -f -e trace=file,network

# Disk IO activity by process
sudo iotop -oP

# Quick memory breakdown by RSS
ps aux --sort=-%mem | head -n 15

# View active HTTP requests/traffic via tcpdump
sudo tcpdump -nn -A -s 0 'tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)'
```

### Text Data & Log Processing
```bash
# Extract top 10 requesting IP addresses from an HTTP access log
awk '{print $1}' access.log | sort | uniq -c | sort -nr | head -n 10

# Stream and filter formatted JSON logs
tail -f app.log | jq -r 'select(.level=="error") | [.timestamp, .message] | @tsv'

# Remove duplicate lines while preserving original order
awk '!visited[$0]++' filename
```

---

## 2. Topic References & Tool Indexes

### Security & Penetration Testing Reference
- **Nmap Cheat Sheet**: Host discovery (`nmap -sn`), SYN scan (`nmap -sS -p-`), OS detection (`nmap -A`).
- **Web Application Security**: OWASP Top 10 auditing, header hardening (CSP, HSTS, X-Frame-Options).
- **Secrets Management**: Scanning repos for exposed credentials (`gitleaks`, `trufflehog`).

### DevOps & Container Operations
- **Docker Clean-Up**:
  ```bash
  docker system prune -a --volumes
  ```
- **Container Memory/CPU Live Stats**:
  ```bash
  docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
  ```

---

## 3. Workflow Protocol

1. **Verify Root Cause & Safety**: Always test non-destructive diagnostic commands (`ss`, `lsof`, `tcpdump`) before running state-changing operations.
2. **Minimal & Efficient Commands**: Favor standard POSIX tools (`awk`, `sed`, `grep`, `find`, `ss`) over heavy dependencies.
3. **Reference Upstream**: For comprehensive curated links to external manuals and cheat sheets, see the full repository at `https://github.com/trimstray/the-book-of-secret-knowledge`.
