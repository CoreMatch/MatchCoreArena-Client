export namespace models {
	
	export class ParticipantReport {
	    uuid: string;
	    survival_time: number;
	    kills: number;
	    deaths: number;
	    perf_tweak: number;
	
	    static createFrom(source: any = {}) {
	        return new ParticipantReport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.uuid = source["uuid"];
	        this.survival_time = source["survival_time"];
	        this.kills = source["kills"];
	        this.deaths = source["deaths"];
	        this.perf_tweak = source["perf_tweak"];
	    }
	}
	export class TeamReportInfo {
	    team_id: string;
	    initial_count: number;
	    alive_count: number;
	    members: ParticipantReport[];
	
	    static createFrom(source: any = {}) {
	        return new TeamReportInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.team_id = source["team_id"];
	        this.initial_count = source["initial_count"];
	        this.alive_count = source["alive_count"];
	        this.members = this.convertValues(source["members"], ParticipantReport);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TeamReportInput {
	    match_type: string;
	    winner_team: TeamReportInfo;
	    loser_teams: TeamReportInfo[];
	    duration_seconds?: number;
	    // Go type: time
	    started_at: any;
	    // Go type: time
	    finished_at: any;
	
	    static createFrom(source: any = {}) {
	        return new TeamReportInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.match_type = source["match_type"];
	        this.winner_team = this.convertValues(source["winner_team"], TeamReportInfo);
	        this.loser_teams = this.convertValues(source["loser_teams"], TeamReportInfo);
	        this.duration_seconds = source["duration_seconds"];
	        this.started_at = this.convertValues(source["started_at"], null);
	        this.finished_at = this.convertValues(source["finished_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

