# Allow using PyMySQL as a drop-in replacement for MySQLdb/mysqlclient
try:
	import pymysql
	pymysql.install_as_MySQLdb()
except Exception:
	# If PyMySQL is not installed, we'll rely on mysqlclient (MySQLdb)
	pass

import pymysql
pymysql.install_as_MySQLdb()